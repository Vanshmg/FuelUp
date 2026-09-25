"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BackIcon } from "@/components/ui/icons";
import { PersonaPicker } from "@/components/PersonaPicker";
import { PROFILE_DEFAULTS } from "@/lib/data/defaults";
import { saveProfile } from "@/lib/storage";
import { ProfileSchema, type AvoidTag, type Cuisine, type Diet, type EffortLevel, type WeeklyLimit } from "@/lib/types";
import { CuisineStep } from "./CuisineStep";
import { EffortStep } from "./EffortStep";
import { RestrictionsStep } from "./RestrictionsStep";

/** The answers so far. Everything else uses sensible defaults, asked later. */
export interface OnboardingAnswers {
  effort: EffortLevel | null;
  cuisines: Cuisine[];
  diet: Diet;
  avoidTags: AvoidTag[];
  weeklyLimits: WeeklyLimit[];
}

type Step = "welcome" | "demo" | 1 | 2 | 3;

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    effort: null,
    cuisines: [],
    diet: "none",
    avoidTags: [],
    weeklyLimits: [],
  });
  const update = (change: Partial<OnboardingAnswers>) => setAnswers((prev) => ({ ...prev, ...change }));

  function finish() {
    const profile = ProfileSchema.safeParse({ ...PROFILE_DEFAULTS, ...answers, avoidFoods: [] });
    if (!profile.success) return; // the Next button is disabled until answers are valid
    saveProfile(profile.data);
    router.replace("/today");
  }

  if (step === "welcome") return <Welcome onStart={() => setStep(1)} onDemo={() => setStep("demo")} />;

  if (step === "demo") {
    return (
      <Frame onBack={() => setStep("welcome")} title="Pick a demo student" subtitle="Each one shows off a different part of FuelUp.">
        <PersonaPicker />
      </Frame>
    );
  }

  const canContinue = step === 1 ? answers.effort !== null : step === 2 ? answers.cuisines.length > 0 : true;

  return (
    <Frame
      onBack={() => setStep(step === 1 ? "welcome" : ((step - 1) as Step))}
      progress={step}
      footer={
        <Button size="lg" disabled={!canContinue} onClick={() => (step === 3 ? finish() : setStep((step + 1) as Step))}>
          {step === 3 ? "Build my plan" : "Next"}
        </Button>
      }
      {...STEP_COPY[step]}
    >
      {step === 1 && <EffortStep value={answers.effort} onChange={(effort) => update({ effort })} />}
      {step === 2 && <CuisineStep value={answers.cuisines} onChange={(cuisines) => update({ cuisines })} />}
      {step === 3 && <RestrictionsStep answers={answers} onChange={update} />}
    </Frame>
  );
}

const STEP_COPY: Record<1 | 2 | 3, { title: string; subtitle: string }> = {
  1: { title: "How much cooking sounds okay?", subtitle: "No wrong answer. FuelUp meets you where you are." },
  2: { title: "What food feels like home?", subtitle: "Pick as many as you like. Your plan starts from these." },
  3: { title: "Anything to stay away from?", subtitle: "FuelUp checks every suggestion against this. Every time." },
};

function Welcome({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 pt-16 pb-10">
      <div className="flex flex-col gap-5">
        <div className="flex gap-2 text-5xl" aria-hidden>
          <span>🥗</span>
          <span>🍛</span>
          <span>🌮</span>
        </div>
        <h1 className="font-display text-5xl leading-[1.05] font-semibold tracking-tight">
          Prep your meals <span className="text-tomato">smarter.</span>
        </h1>
        <p className="text-lg leading-relaxed text-ink-soft">
          Meal plans built around your effort level, your restrictions, your budget, and the food you already know.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Button size="lg" onClick={onStart}>
          Get started · 3 quick questions
        </Button>
        <Button size="lg" variant="secondary" onClick={onDemo}>
          Load demo data
        </Button>
      </div>
    </main>
  );
}

function Frame({
  title,
  subtitle,
  progress,
  onBack,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  progress?: number;
  onBack: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-4 pb-6">
      <div className="flex h-12 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="-ml-2 flex size-11 items-center justify-center rounded-full text-ink-soft hover:bg-cream-deep"
        >
          <BackIcon />
        </button>
        {progress !== undefined && (
          <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={progress} aria-label={`Question ${progress} of 3`}>
            {[1, 2, 3].map((n) => (
              <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= progress ? "bg-tomato" : "bg-line"}`} />
            ))}
          </div>
        )}
      </div>

      <header className="mt-6 mb-6 flex flex-col gap-2">
        {progress !== undefined && <p className="text-sm font-semibold text-tomato-deep">Question {progress} of 3</p>}
        <h1 className="font-display text-3xl leading-tight font-semibold">{title}</h1>
        <p className="text-ink-soft">{subtitle}</p>
      </header>

      <div className="flex-1">{children}</div>
      {footer && <div className="sticky bottom-0 mt-6 bg-gradient-to-t from-cream from-70% pt-4">{footer}</div>}
    </main>
  );
}
