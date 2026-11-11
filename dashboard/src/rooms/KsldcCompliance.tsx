import { useMemo, useState } from "react";
import { Calculator, FileText, Printer, ShieldCheck } from "lucide-react";
import { useGridStore } from "../store/useGridStore";
import { computeMetrics } from "../utils/metrics";
import type { ProblemId } from "../types";

export function KsldcCompliance() {
  const { activeSplit, testData, valData, benchmarks } = useGridStore();
  const ds = activeSplit === "val_2025" && valData ? valData : testData;

  const [dsmProb, setDsmProb] = useState<ProblemId>("S1");
  const [penaltyRateInrPerMwh, setPenaltyRateInrPerMwh] = useState<number>(650);

  const dsmSimulation = useMemo(() => {
    if (!ds) return null;
    const p = ds.problems[dsmProb];
    const isSolar = dsmProb === "S1" || dsmProb === "S24";
    const bandDenom = isSolar ? 2050.0 : 13481.2;

    const evalSeries = (pred: number[]) => {
      let violations = 0;
      let activeHours = 0;
      let excessMwh = 0;

      for (let i = 0; i < p.y_true.length; i++) {
        const yt = p.y_true[i];
        const yp = pred[i];
        if (isSolar && yt <= 25 && yp <= 25) continue;
        activeHours++;
        const absErr = Math.abs(yp - yt);
        const allowBand = 0.10 * (isSolar ? bandDenom : Math.max(yt, 1000));
        if (absErr > allowBand) {
          violations++;
          excessMwh += absErr - allowBand;
        }
      }

      const penaltyInr = excessMwh * penaltyRateInrPerMwh;
      const compliancePct = activeHours > 0 ? ((activeHours - violations) / activeHours) * 100 : 100;
      return { violations, activeHours, excessMwh, penaltyInr, compliancePct };
    };

    const champ = evalSeries(p.y_pred_post);
    const lstm = evalSeries(p.members.lstm);
    const persist = evalSeries(p.persistence);

    return {
      champ,
      lstm,
      persist,
      savedVsPersistLakhs: (persist.penaltyInr - champ.penaltyInr) / 100000,
      savedVsLstmLakhs: (lstm.penaltyInr - champ.penaltyInr) / 100000,
    };
  }, [ds, dsmProb, penaltyRateInrPerMwh]);

  const summaryMatrix = useMemo(() => {
    if (!ds) return [];
    return (["S1", "S24", "D1", "D24"] as ProblemId[]).map((pid) => {
      const p = ds.problems[pid];
      const m = computeMetrics(p.y_true, p.y_pred_post, p.persistence, pid);
      const qRow =
        activeSplit === "test_2026"
          ? benchmarks?.m10_test_probabilistic.find((q) => q.problem === pid)
          : benchmarks?.m8_probabilistic_val.find((q) => q.problem === pid);
      let covHits = 0;
      for (let i = 0; i < p.y_true.length; i++) {
        if (p.y_true[i] >= p.p10[i] && p.y_true[i] <= p.p90[i]) covHits++;
      }
      const empCov = p.y_true.length > 0 ? (covHits / p.y_true.length) * 100 : null;
      const csvCov = qRow && typeof qRow.coverage_80pct === "number" ? qRow.coverage_80pct * 100 : null;
      return { pid, ...m, coverage80: csvCov ?? empCov };
    });
  }, [ds, benchmarks, activeSplit]);

  if (!ds || !dsmSimulation) return null;

  return (
    <div className="space-y-4">
      <div className="cad-panel rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-base sm:text-lg font-bold text-white light:text-slate-900">
            KSLDC Executive DSM Compliance &amp; Reporting Suite
          </h1>
          <p className="text-xs text-slate-400 light:text-slate-600">
            CERC / KERC ±10% Deviation Settlement Mechanism (DSM) financial impact &amp; print-ready dispatch dossier
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="no-print inline-flex items-center gap-1.5 rounded-full bg-[#EDF2F7] light:bg-slate-900 px-4 py-2 text-xs font-semibold text-[#07080B] light:text-white hover:bg-white light:hover:bg-slate-800 transition cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Print / Export Dossier (PDF)
        </button>
      </div>

      <section data-tour-id="kc-dsm-sim" className="cad-panel rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#E5A93C] light:text-amber-600" />
            <h2 className="font-display text-base font-bold text-white light:text-slate-900">
              ±10% DSM Band Deviation Settlement Simulator
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono-num">
            <select
              value={dsmProb}
              onChange={(e) => setDsmProb(e.target.value as ProblemId)}
              className="rounded-lg border border-white/10 light:border-slate-300 bg-[#0D1017] light:bg-white px-2.5 py-1.5 text-slate-200 light:text-slate-800"
            >
              <option value="S1">S1 (Solar 1h)</option>
              <option value="S24">S24 (Solar 24h)</option>
              <option value="D1">D1 (Demand 1h)</option>
              <option value="D24">D24 (Demand 24h)</option>
            </select>

            <label className="flex items-center gap-2 text-slate-300 light:text-slate-700">
              <span>DSM Penalty Rate: ₹{penaltyRateInrPerMwh}/MWh</span>
              <input
                type="range"
                min={250}
                max={1500}
                step={50}
                value={penaltyRateInrPerMwh}
                onChange={(e) => setPenaltyRateInrPerMwh(Number(e.target.value))}
                className="w-28 cursor-pointer"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 font-mono-num">
          <div className="rounded-xl border border-[#34D399]/35 light:border-emerald-600/35 bg-[#34D399]/[0.06] light:bg-emerald-500/[0.08] p-4">
            <div className="text-[11px] text-[#6EE7B7] light:text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> CHAMPION STACKING + M9
            </div>
            <div className="mt-1.5 text-2xl font-bold text-white light:text-slate-900">
              {dsmSimulation.champ.compliancePct.toFixed(2)}%
            </div>
            <div className="text-[11px] text-slate-300 light:text-slate-700">
              {dsmSimulation.champ.violations} breaches / {dsmSimulation.champ.activeHours} hrs
            </div>
            <div className="mt-1 text-xs text-[#6EE7B7] light:text-emerald-700">
              Penalty: ₹{(dsmSimulation.champ.penaltyInr / 100000).toFixed(2)} Lakhs
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] light:border-slate-900/10 bg-white/[0.03] light:bg-slate-900/[0.04] p-4">
            <div className="text-[11px] text-[#8ED8F8] light:text-sky-700">SINGLE MODEL (UNTUNED LSTM)</div>
            <div className="mt-1.5 text-2xl font-bold text-white light:text-slate-900">
              {dsmSimulation.lstm.compliancePct.toFixed(2)}%
            </div>
            <div className="text-[11px] text-slate-400 light:text-slate-600">
              {dsmSimulation.lstm.violations} breaches / {dsmSimulation.lstm.activeHours} hrs
            </div>
            <div className="mt-1 text-xs text-slate-300 light:text-slate-700">
              Penalty: ₹{(dsmSimulation.lstm.penaltyInr / 100000).toFixed(2)} Lakhs
            </div>
          </div>

          <div className="rounded-xl border border-[#F46060]/30 light:border-red-600/30 bg-[#F46060]/[0.06] light:bg-red-500/[0.07] p-4">
            <div className="text-[11px] text-[#FCA5A5] light:text-red-700">NAIVE PERSISTENCE BASELINE</div>
            <div className="mt-1.5 text-2xl font-bold text-white light:text-slate-900">
              {dsmSimulation.persist.compliancePct.toFixed(2)}%
            </div>
            <div className="text-[11px] text-slate-400 light:text-slate-600">
              {dsmSimulation.persist.violations} breaches / {dsmSimulation.persist.activeHours} hrs
            </div>
            <div className="mt-1 text-xs text-[#FCA5A5] light:text-red-700">
              Penalty: ₹{(dsmSimulation.persist.penaltyInr / 100000).toFixed(2)} Lakhs
            </div>
          </div>

          <div className="cad-panel-amber rounded-xl p-4 flex flex-col justify-center">
            <div className="text-[11px] text-[#F3C669] light:text-amber-700">NET SAVINGS VS PERSISTENCE</div>
            <div className="mt-1 text-2xl font-bold text-[#F3C669] light:text-amber-700">
              ₹{Math.max(0, dsmSimulation.savedVsPersistLakhs).toFixed(2)} Lakhs
            </div>
            <div className="text-[11px] text-slate-300 light:text-slate-700 mt-1">
              Over {activeSplit === "test_2026" ? "Jan–Feb 2026 (58 days)" : "Full Year 2025"}
            </div>
          </div>
        </div>
      </section>

      <section data-tour-id="kc-matrix" className="cad-panel rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-bold text-white light:text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#5CB8E4] light:text-sky-600" />
            Verified Champion Multi-Horizon Scorecard ({activeSplit === "test_2026" ? "Test 2026" : "Val 2025"})
          </h2>
          <span className="text-xs font-mono-num text-slate-400 light:text-slate-600">Stacking Ridge + M9 Constraints</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08] light:border-slate-200">
          <table className="w-full text-left text-xs font-mono-num">
            <thead className="bg-[#090B10] light:bg-slate-100 text-slate-400 light:text-slate-600 border-b border-white/[0.08] light:border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Problem</th>
                <th className="py-2.5 px-3 text-right">RMSE (MW)</th>
                <th className="py-2.5 px-3 text-right">MAE (MW)</th>
                <th className="py-2.5 px-3 text-right">nMAE (%)</th>
                <th className="py-2.5 px-3 text-right">MAPE (%)</th>
                <th className="py-2.5 px-3 text-right">R²</th>
                <th className="py-2.5 px-3 text-right">Skill (%)</th>
                <th className="py-2.5 px-3 text-right">DSM ±10% (%)</th>
                <th className="py-2.5 px-3 text-right">P10–P90 Cov</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] light:divide-slate-200 text-slate-200 light:text-slate-800">
              {summaryMatrix.map((row) => (
                <tr key={row.pid} className="hover:bg-white/[0.03] light:hover:bg-slate-900/[0.04]">
                  <td className="py-2.5 px-3 font-bold text-[#8ED8F8] light:text-sky-700">{row.pid}</td>
                  <td className="py-2.5 px-3 text-right font-bold">{row.rmse.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right">{row.mae.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right">{row.nmaePct.toFixed(2)}%</td>
                  <td className="py-2.5 px-3 text-right">
                    {row.mapePct !== null ? `${row.mapePct.toFixed(2)}%` : "N/A (Night 0)"}
                  </td>
                  <td className="py-2.5 px-3 text-right text-[#6EE7B7] light:text-emerald-700">{row.r2.toFixed(4)}</td>
                  <td className="py-2.5 px-3 text-right text-[#6EE7B7] light:text-emerald-700">
                    +{row.skillPct.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right text-[#F3C669] light:text-amber-700">
                    {row.dsmInBandPct.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {row.coverage80 !== null ? `${row.coverage80.toFixed(1)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
