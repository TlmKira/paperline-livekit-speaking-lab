// FILE: src/components/ui/footer.tsx
import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";
import { Card } from "@/components/ui/card";
import { PrivacyChoicesModal } from "@/components/ui/privacy-choices-modal";
import { getI18n } from "@/lib/i18n/server";

export async function Footer() {
  const { dictionary } = await getI18n();
  const footerSections = [
    {
      title: dictionary.footer.practice,
      links: [
        { label: dictionary.footer.practiceStudio, href: "/signup" },
        { label: dictionary.footer.aiConversation, href: "/signup" },
        { label: dictionary.footer.dailyModules, href: "/signup" },
        { label: dictionary.footer.progressTracking, href: "/signup" },
      ],
    },
    {
      title: dictionary.footer.product,
      links: [
        { label: dictionary.footer.features, href: "/#features" },
        { label: dictionary.footer.pricing, href: "/#pricing" },
        { label: dictionary.footer.faq, href: "/#faq" },
        { label: dictionary.footer.feedback, href: "/contact" },
      ],
    },
    {
      title: dictionary.footer.support,
      links: [
        { label: dictionary.footer.helpCenter, href: "/help" },
        { label: dictionary.footer.contactSupport, href: "/contact" },
        { label: dictionary.footer.privacyPolicy, href: "/privacy" },
        { label: dictionary.footer.termsOfService, href: "/terms" },
      ],
    },
  ];
  const legalLinks = [
    { label: dictionary.footer.helpCenter, href: "/help" },
    { label: dictionary.footer.termsOfService, href: "/terms" },
    { label: dictionary.footer.privacyPolicy, href: "/privacy" },
  ];
  const year = new Date().getFullYear();

  return (
    <footer className="pb-2">
      <Card className="bg-hunter-green text-white">
        <div className="space-y-12">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr_0.95fr_0.95fr]">
            <div className="space-y-4">
              <Link href="/" className="inline-flex items-center">
                <BrandMark variant="white" />
              </Link>
              <p className="max-w-sm text-sm leading-7 text-white/78">
                {dictionary.footer.description}
              </p>
              <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm text-white/82">
                {dictionary.footer.badge}
              </div>
            </div>

            {footerSections.map((section) => (
              <div key={section.title} className="space-y-2">
                <h3 className="text-lg font-semibold text-white">
                  {section.title}
                </h3>
                <div className="flex flex-col gap-1">
                  {section.links.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="inline-flex w-fit items-center text-sm text-white/78 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 pb-4">
            <div className="flex flex-col gap-4 text-xs text-white/64 lg:flex-row lg:items-center lg:justify-between">
              <p>© {year} Cadence. {dictionary.footer.rights}</p>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 lg:justify-end">
                {legalLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-xs transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
                <PrivacyChoicesModal />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </footer>
  );
}
