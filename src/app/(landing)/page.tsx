// FILE: src/app/page.tsx
import type { Metadata } from "next";
import { connection } from "next/server";
import Image from "next/image";
import { Activity, Microphone, PlayCircle } from "griddy-icons";
import { Navbar } from "@/components/ui/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/ui/footer";
import { FaqSection } from "@/components/ui/faq-section";
import { PricingSection } from "@/components/ui/pricing-section";
import { SplitText } from "@/components/ui/split-text";
import { TrustedByStrip } from "@/components/ui/trusted-by-strip";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { dictionary } = await getI18n();

  return {
    title: dictionary.landing.metaTitle,
    description: dictionary.landing.metaDescription,
    openGraph: {
      title: `Cadence — ${dictionary.landing.metaTitle}`,
      description: dictionary.landing.metaDescription,
    },
  };
}

export default async function Home() {
  await connection();
  const { dictionary } = await getI18n();
  const copy = dictionary.landing;
  const processCards = [
    {
      title: copy.process.speakTitle,
      description: copy.process.speakBody,
      icon: Microphone,
    },
    {
      title: copy.process.soundTitle,
      description: copy.process.soundBody,
      icon: Activity,
    },
    {
      title: copy.process.retryTitle,
      description: copy.process.retryBody,
      icon: PlayCircle,
    },
  ];
  const moduleCards = [
    {
      title: copy.modules.guidedTitle,
      description: copy.modules.guidedBody,
    },
    {
      title: copy.modules.conversationTitle,
      description: copy.modules.conversationBody,
    },
    {
      title: copy.modules.remindersTitle,
      description: copy.modules.remindersBody,
    },
    {
      title: copy.modules.progressTitle,
      description: copy.modules.progressBody,
    },
    {
      title: copy.modules.streakTitle,
      description: copy.modules.streakBody,
    },
  ];

  return (
    <main className="min-h-screen px-5 py-5 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <Navbar current="home" />

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="bg-hunter-green p-0 text-white">
            <div className="flex h-full flex-col justify-between gap-6 px-6 py-6 sm:px-8 sm:py-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-yellow-green">
                  <Activity size={18} filled color="currentColor" />
                  <span className="eyebrow text-sm">{copy.heroEyebrow}</span>
                </div>
                <div className="space-y-3">
                  <SplitText
                    text={copy.heroTitle}
                    tag="h1"
                    delay={22}
                    duration={760}
                    className="max-w-3xl text-balance text-4xl font-semibold leading-tight sm:text-5xl"
                  />
                  <p className="max-w-2xl text-base leading-8 text-white/78 sm:text-lg">
                    {copy.heroBody}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button href="/dashboard" className="bg-sage-green text-white hover:bg-[#7aa65f]">
                  {copy.tryStudio}
                </Button>
                <Button variant="secondary" href="/signup">
                  {copy.createAccount}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-visible bg-white p-0">
            <div className="flex h-full flex-col gap-4 px-6 py-6 sm:px-8 sm:py-8">
              <div className="space-y-2">
                <p className="eyebrow text-sm text-sage-green">
                  {copy.studioEyebrow}
                </p>
                <h2 className="font-kicker text-2xl font-semibold text-hunter-green">
                  {copy.studioTitle}
                </h2>
              </div>

              <div className="flex flex-1 items-center justify-center">
                <Image
                  src="/illustration/communication-1.svg"
                  alt={copy.peopleAlt}
                  width={520}
                  height={380}
                  className="h-auto w-full max-w-md translate-y-12 object-contain sm:translate-y-14"
                  priority
                />
              </div>
            </div>
          </Card>
        </section>

        <TrustedByStrip />

        <section id="features" className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="bg-white">
            <div className="grid gap-4">
              {processCards.map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="rounded-3xl bg-bright-snow px-4 py-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 text-sage-green">
                      <Icon size={24} filled color="currentColor" />
                    </div>
                    <div className="space-y-2">
                      <CardTitle className="font-kicker text-xl">{title}</CardTitle>
                      <CardDescription>{description}</CardDescription>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-vanilla-cream sm:col-span-2">
              <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr] md:items-center">
                <div className="flex items-center justify-center">
                  <Image
                    src="/illustration/progress-1.svg"
                    alt={copy.progressAlt}
                    width={420}
                    height={280}
                    className="h-auto w-full max-w-xs object-contain"
                  />
                </div>
                <div className="space-y-3">
                  <p className="eyebrow text-sm text-sage-green">
                    {copy.consistencyEyebrow}
                  </p>
                  <h2 className="text-3xl font-semibold text-hunter-green">
                    {copy.consistencyTitle}
                  </h2>
                  <p className="text-base leading-8 text-iron-grey">
                    {copy.consistencyBody}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-hunter-green text-white">
              <p className="eyebrow text-sm text-yellow-green/80">
                {copy.transcriptEyebrow}
              </p>
              <p className="mt-4 text-2xl font-semibold">
                {copy.transcriptTitle}
              </p>
              <p className="mt-3 text-sm leading-7 text-white/78">
                {copy.transcriptBody}
              </p>
            </Card>

            <Card className="bg-white">
              <p className="eyebrow text-sm text-sage-green">
                {copy.audienceEyebrow}
              </p>
              <p className="mt-4 text-2xl font-semibold text-hunter-green">
                {copy.audienceTitle}
              </p>
              <p className="mt-3 text-sm leading-7 text-iron-grey">
                {copy.audienceBody}
              </p>
            </Card>
          </div>
        </section>

        <section id="pricing">
          <PricingSection />
        </section>

        <section id="roadmap" className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card className="bg-hunter-green text-white">
            <div className="space-y-4">
              <p className="eyebrow text-sm text-yellow-green/80">
                {copy.roadmapEyebrow}
              </p>
              <h2 className="max-w-2xl text-3xl font-semibold leading-tight">
                {copy.roadmapTitle}
              </h2>
              <p className="max-w-2xl text-sm leading-8 text-white/78">
                {copy.roadmapBody}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {moduleCards.map((module) => (
                  <div
                    key={module.title}
                    className={`rounded-3xl bg-white/10 px-4 py-4 ${
                      module.title === "Streak system" ? "sm:col-span-2" : ""
                    }`}
                  >
                    <h3 className="text-lg font-semibold">{module.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/76">
                      {module.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="bg-white p-0">
            <div className="flex h-full flex-col gap-4 px-6 py-6">
              <div className="space-y-2">
                <p className="eyebrow text-sm text-sage-green">
                  {copy.hostedEyebrow}
                </p>
                <h2 className="text-2xl font-semibold text-hunter-green">
                  {copy.hostedTitle}
                </h2>
                <p className="text-sm leading-7 text-iron-grey">
                  {copy.hostedBody}
                </p>
              </div>

              <div className="flex flex-1 items-center justify-center">
                <Image
                  src="/illustration/following-your-dreams-1.svg"
                  alt={copy.growthAlt}
                  width={430}
                  height={340}
                  className="h-auto w-full max-w-sm object-contain"
                />
              </div>
            </div>
          </Card>
        </section>

        <section id="faq">
          <FaqSection />
        </section>

        <Footer />
      </div>
    </main>
  );
}
