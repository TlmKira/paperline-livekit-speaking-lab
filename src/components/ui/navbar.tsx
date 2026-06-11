// FILE: src/components/ui/navbar.tsx
import Link from "next/link";
import { Download, Settings } from "griddy-icons";
import { BrandMark } from "@/components/ui/brand-mark";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { NavbarFrame } from "@/components/ui/navbar-frame";
import { getAppSession } from "@/lib/app-session";
import { getI18n } from "@/lib/i18n/server";
import { getRequestRuntime } from "@/lib/runtime/request-runtime";
import { cn } from "@/lib/utils";

type NavKey =
  | "home"
  | "dashboard"
  | "learn"
  | "login"
  | "signup"
  | "conversation"
  | "coach"
  | "profile"
  | "download";

interface NavbarProps {
  current?: NavKey;
  variant?: "default" | "dark";
}

const navBaseClass =
  "inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold whitespace-nowrap";

export async function Navbar({ current, variant = "default" }: NavbarProps) {
  const session = await getAppSession();
  const runtime = await getRequestRuntime();
  const { dictionary } = await getI18n();
  const isAuthenticated = Boolean(session.user);
  const logoHref = isAuthenticated ? "/dashboard" : "/";

  const navItems = isAuthenticated
    ? [
        {
          href: "/dashboard",
          key: "home" as const,
          label: dictionary.nav.home,
          locked: false,
        },
        {
          href: "/learn",
          key: "learn" as const,
          label: dictionary.nav.modules,
          locked: false,
        },
        {
          href: "/conversation",
          key: "conversation" as const,
          label: dictionary.nav.conversation,
          locked: false,
        },
        {
          href: "/coach",
          key: "coach" as const,
          label: dictionary.nav.aiCoach,
          locked: false,
        },
      ]
    : [
        {
          href: "/login",
          key: "login" as const,
          label: dictionary.nav.login,
          locked: false,
        },
        {
          href: "/signup",
          key: "signup" as const,
          label: dictionary.nav.signup,
          locked: false,
        },
      ];

  const isDark = variant === "dark";

  // Inactive item styles differ between default (white card) and dark (green card)
  const inactiveClass = isDark
    ? "bg-white/10 text-bright-snow hover:bg-white/20"
    : "bg-vanilla-cream text-hunter-green hover:bg-[#eadfbe]";

  const activeClass = "bg-yellow-green text-hunter-green";

  const signupCtaClass = isDark
    ? "bg-yellow-green text-hunter-green hover:bg-[#b5d567]"
    : "bg-yellow-green text-hunter-green hover:bg-[#b5d567]";

  return (
    <NavbarFrame variant={variant} runtime={runtime}>
      <Link
        href={logoHref}
        className="flex h-11 items-center justify-center self-center"
      >
        <BrandMark variant={isDark ? "white" : "dark"} />
      </Link>

      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto self-center">
        <LanguageSwitcher variant={isDark ? "dark" : "default"} />

        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              navBaseClass,
              current === item.key
                ? activeClass
                : item.key === "signup" && !isAuthenticated
                  ? signupCtaClass
                  : inactiveClass,
            )}
          >
            {item.label}
          </Link>
        ))}

        {!isAuthenticated && (
          <Link
            href="/download"
            className={cn(
              navBaseClass,
              "gap-1.5",
              current === ("download" satisfies NavKey)
                ? activeClass
                : inactiveClass,
            )}
            aria-label={dictionary.nav.downloadDesktop}
          >
            <Download size={15} color="currentColor" />
            {dictionary.nav.download}
          </Link>
        )}

        {isAuthenticated && (
          <Link
            href="/profile"
            className={cn(
              navBaseClass,
              "min-h-11 w-11 px-0",
              current === ("profile" satisfies NavKey)
                ? activeClass
                : inactiveClass,
            )}
            aria-label={dictionary.nav.profileSettings}
          >
            <Settings size={18} color="currentColor" />
          </Link>
        )}
      </div>
    </NavbarFrame>
  );
}
