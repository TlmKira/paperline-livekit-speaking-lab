// FILE: src/components/auth/AuthForm.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import type { AppRuntime } from "@/lib/runtime/request-runtime";
import { cn } from "@/lib/utils";

interface AuthFormProps {
  mode: "login" | "signup";
  runtime: AppRuntime;
}

export function AuthForm({ mode, runtime }: AuthFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const isLogin = mode === "login";
  const isDesktop = runtime === "desktop";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    try {
      setIsSubmitting(true);

      if (!isSupabaseConfigured) {
        throw new Error(
          t("auth.supabaseMissing"),
        );
      }

      const supabase = createSupabaseBrowserClient();

      if (isLogin) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          throw authError;
        }

        setMessage(t("auth.loginSuccess"));
        startTransition(() => {
          router.replace("/dashboard");
          router.refresh();
        });
        return;
      }

      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            typeof window === "undefined"
              ? undefined
              : `${window.location.origin}/api/auth/confirm?next=/checkout`,
        },
      });

      if (authError) {
        throw authError;
      }

      setMessage(
        t("auth.signupSuccess"),
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : t("auth.authFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isDesktop) {
    return (
      <Card className="w-full max-w-[30rem] bg-transparent p-0 backdrop-blur-0">
        <div className="space-y-6">
          <div className="space-y-4 px-5 sm:px-6">
            <Link href="/" className="inline-flex w-fit items-center" aria-label={t("auth.goHome")}>
              <Image
                src="/logo/logo-green-white.svg"
                alt={t("auth.logoAlt")}
                width={136}
                height={30}
                className="h-[30px] w-auto object-contain"
                priority
              />
            </Link>

            <div className="space-y-3">
              <CardTitle className="text-[2rem] leading-tight sm:text-[2.15rem]">
                {isLogin ? t("auth.loginTitle") : t("auth.signupTitle")}
              </CardTitle>
              <CardDescription className="text-base">
                {isLogin
                  ? t("auth.loginDescription")
                  : t("auth.signupDescription")}
              </CardDescription>
            </div>
          </div>

          <form
            className="space-y-4 px-5 py-1 sm:px-6"
            onSubmit={handleSubmit}
          >
            <label className="block">
              <span className="block pb-2 text-sm font-medium text-hunter-green">{t("auth.email")}</span>
              <Input
                type="email"
                autoComplete="email"
                placeholder="learner@cadence.app"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="bg-white"
              />
            </label>

            <label className="block">
              <span className="block pb-2 text-sm font-medium text-hunter-green">{t("auth.password")}</span>
              <Input
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                className="bg-white"
              />
            </label>

            {message ? (
              <div className="rounded-3xl bg-yellow-green px-4 py-3 text-sm text-hunter-green">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-3xl bg-blushed-brick px-4 py-3 text-sm text-bright-snow">
                {error}
              </div>
            ) : null}

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isLogin
                  ? t("auth.signingIn")
                  : t("auth.creatingAccount")
                : isLogin
                  ? t("auth.signIn")
                  : t("auth.createAccount")}
            </Button>

            {isLogin ? (
              <div className="pt-1 text-right">
                <Link href="/forgot-password" className="text-sm font-semibold text-sage-green">
                  {t("auth.forgotPassword")}
                </Link>
              </div>
            ) : null}
          </form>

          <p className="px-5 text-sm leading-7 text-iron-grey sm:px-6">
            {isLogin ? t("auth.needAccount") : t("auth.alreadyHaveAccount")}{" "}
            <Link
              href={isLogin ? "/signup" : "/login"}
              className="font-semibold text-sage-green"
            >
              {isLogin ? t("auth.createOneHere") : t("auth.signInHere")}
            </Link>
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "w-full max-w-[32rem] p-0 backdrop-blur-0",
        isDesktop
          ? "bg-transparent shadow-none"
          : "bg-transparent shadow-none",
      )}
    >
      <div className="space-y-6">
        <div className="space-y-4 px-5 sm:px-6">
          <div className="inline-flex w-fit items-center">
            <Image
              src="/logo/logo-green-white.svg"
              alt={t("auth.logoAlt")}
              width={136}
              height={30}
              className="h-[30px] w-auto object-contain"
              priority
            />
          </div>

          <div className="space-y-3">
            <CardTitle className="text-[2rem] leading-tight sm:text-[2.15rem]">
              {isLogin ? t("auth.loginTitle") : t("auth.signupTitle")}
            </CardTitle>
            <CardDescription className="text-base">
              {isLogin
                ? t("auth.loginDescription")
                : t("auth.signupDescription")}
            </CardDescription>
          </div>
        </div>

        <form
          className={cn(
            "space-y-4 px-5 py-1 sm:px-6",
            isDesktop
              ? ""
              : "border border-[#e6d9bd] bg-white px-6 py-6 shadow-[0_20px_64px_rgba(41,66,45,0.08)] sm:px-7 sm:py-7 lg:px-8",
          )}
          onSubmit={handleSubmit}
        >
          <label className="block">
            <span className="block pb-2 text-sm font-medium text-hunter-green">{t("auth.email")}</span>
            <Input
              type="email"
              autoComplete="email"
              placeholder="learner@cadence.app"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="bg-white"
            />
          </label>

          <label className="block">
            <span className="block pb-2 text-sm font-medium text-hunter-green">{t("auth.password")}</span>
            <Input
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="bg-white"
            />
          </label>

          {message ? (
            <div className="rounded-3xl bg-yellow-green px-4 py-3 text-sm text-hunter-green">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-3xl bg-blushed-brick px-4 py-3 text-sm text-bright-snow">
              {error}
            </div>
          ) : null}

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isLogin
                ? t("auth.signingIn")
                : t("auth.creatingAccount")
              : isLogin
                ? t("auth.signIn")
                : t("auth.createAccount")}
          </Button>

          {isLogin ? (
            <div className="pt-1 text-right">
              <Link href="/forgot-password" className="text-sm font-semibold text-sage-green">
                {t("auth.forgotPassword")}
              </Link>
            </div>
          ) : null}
        </form>

        <p className="px-5 text-sm leading-7 text-iron-grey sm:px-6">
          {isLogin ? t("auth.needAccount") : t("auth.alreadyHaveAccount")}{" "}
          <Link
            href={isLogin ? "/signup" : "/login"}
            className="font-semibold text-sage-green"
          >
            {isLogin ? t("auth.createOneHere") : t("auth.signInHere")}
          </Link>
        </p>
      </div>
    </Card>
  );
}
