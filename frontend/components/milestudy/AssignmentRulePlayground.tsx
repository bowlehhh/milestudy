"use client";

import { useMemo, useState } from "react";

import { assignmentMethods } from "@/data/milestudy-prototype";
import { SubmissionMethod, SubmissionRule } from "@/types/milestudy";

import { SectionTitle } from "./SectionTitle";

const defaultEnabled: Record<SubmissionMethod, boolean> = {
  text: true,
  file: true,
  image: false,
  link: false,
};

const defaultValues: Record<SubmissionMethod, string> = {
  text: "",
  file: "",
  image: "",
  link: "",
};

export function AssignmentRulePlayground() {
  const [submissionRule, setSubmissionRule] = useState<SubmissionRule>("any");
  const [enabledMethods, setEnabledMethods] =
    useState<Record<SubmissionMethod, boolean>>(defaultEnabled);
  const [answers, setAnswers] = useState<Record<SubmissionMethod, string>>(defaultValues);
  const [score, setScore] = useState(85);

  const maxScore = 100;
  const xpReward = 120;

  const selectedMethods = useMemo(
    () => assignmentMethods.filter((method) => enabledMethods[method.id]),
    [enabledMethods],
  );

  const filledMethods = selectedMethods.filter((method) => answers[method.id].trim().length > 0);

  const isValidSubmission =
    submissionRule === "any"
      ? filledMethods.length > 0
      : filledMethods.length === selectedMethods.length && selectedMethods.length > 0;

  const missingMethodLabels = selectedMethods
    .filter((method) => answers[method.id].trim().length === 0)
    .map((method) => method.label);

  const xpEarned = Number(((xpReward * score) / maxScore).toFixed(2));

  return (
    <section className="space-y-5">
      <SectionTitle
        eyebrow="Assignment"
        title="Flexible Submission Playground"
        subtitle="Guru dapat memilih metode pengumpulan dan rule validasi. Komponen ini menunjukkan logika ANY/ALL secara realtime."
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Konfigurasi Tugas</h3>

          <div className="mt-4 space-y-3">
            {assignmentMethods.map((method) => (
              <label
                key={method.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-sky-600"
                  checked={enabledMethods[method.id]}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setEnabledMethods((current) => ({ ...current, [method.id]: checked }));

                    if (!checked) {
                      setAnswers((current) => ({ ...current, [method.id]: "" }));
                    }
                  }}
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{method.label}</span>
                  <span className="block text-xs text-slate-600">{method.helper}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Submission Rule
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <button
                type="button"
                onClick={() => setSubmissionRule("any")}
                className={`rounded-lg border px-3 py-2 ${
                  submissionRule === "any"
                    ? "border-sky-500 bg-sky-100 text-sky-900"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                ANY
              </button>
              <button
                type="button"
                onClick={() => setSubmissionRule("all")}
                className={`rounded-lg border px-3 py-2 ${
                  submissionRule === "all"
                    ? "border-sky-500 bg-sky-100 text-sky-900"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                ALL
              </button>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Simulasi Jawaban Siswa</h3>

          <div className="mt-4 space-y-3">
            {selectedMethods.length === 0 ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Pilih minimal satu metode pengumpulan terlebih dahulu.
              </p>
            ) : (
              selectedMethods.map((method) => (
                <label key={method.id} className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                    {method.label}
                  </span>
                  <input
                    value={answers[method.id]}
                    onChange={(event) =>
                      setAnswers((current) => ({
                        ...current,
                        [method.id]: event.target.value,
                      }))
                    }
                    placeholder={`Isi contoh untuk ${method.label.toLowerCase()}`}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500"
                  />
                </label>
              ))
            )}
          </div>

          <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              Validation Result
            </p>

            <p
              className={`text-sm font-medium ${
                isValidSubmission ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {isValidSubmission
                ? "Submission valid. Siswa bisa submit tugas."
                : "Submission belum valid sesuai rule saat ini."}
            </p>

            {!isValidSubmission && missingMethodLabels.length > 0 ? (
              <p className="text-xs text-slate-600">
                Method yang belum diisi: {missingMethodLabels.join(", ")}.
              </p>
            ) : null}
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              XP Formula Demo
            </p>
            <p className="mt-2 text-sm text-slate-700">
              XP didapat = XP Reward x (Score / Max Score)
            </p>

            <div className="mt-3">
              <label className="mb-1 block text-sm text-slate-600">Score: {score}</label>
              <input
                type="range"
                min={0}
                max={100}
                value={score}
                onChange={(event) => setScore(Number(event.target.value))}
                className="w-full"
              />
            </div>

            <p className="mt-2 text-sm font-semibold text-slate-900">
              XP: {xpReward} x ({score}/{maxScore}) = {xpEarned}
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
