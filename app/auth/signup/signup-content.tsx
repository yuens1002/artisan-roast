"use client";

import { Suspense, useActionState, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { FormHeading } from "@/components/ui/forms/FormHeading";
import { Field, FieldGroup } from "@/components/ui/field";
import { PasswordFields } from "@/components/auth/PasswordFields";
import { signUpPublic } from "@/app/auth/actions";

type State = {
  message?: string;
  name?: string;
  email?: string;
  emailError?: string;
  passwordError?: string;
  confirmPasswordError?: string;
};

function SignupContentInner() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/account";

  const signInHref = useMemo(() => {
    if (callbackUrl !== "/account") {
      return `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    }
    return "/auth/signin";
  }, [callbackUrl]);

  const [state, action, isPending] = useActionState<State, FormData>(
    signUpPublic,
    {}
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordsValid, setPasswordsValid] = useState(false);

  return (
    <form action={action}>
      {callbackUrl !== "/account" && (
        <input type="hidden" name="redirectTo" value={callbackUrl} />
      )}
      <FieldGroup>
        <Field>
          <FormHeading htmlFor="name" label="Name" />
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="John Doe"
            disabled={isPending}
            defaultValue={state?.name || ""}
          />
        </Field>

        <Field>
          <FormHeading
            htmlFor="email"
            label="Email"
            required
            errorMessage={state?.emailError}
            validationType={state?.emailError ? "error" : undefined}
          />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="your@email.com"
            required
            disabled={isPending}
            defaultValue={state?.email || ""}
          />
        </Field>

        <PasswordFields
          password={password}
          confirmPassword={confirmPassword}
          onPasswordChange={setPassword}
          onConfirmPasswordChange={setConfirmPassword}
          disabled={isPending}
          passwordError={state?.passwordError}
          confirmPasswordError={state?.confirmPasswordError}
          passwordLabel="Password"
          confirmLabel="Confirm Password"
          passwordPlaceholder="Minimum 8 characters"
          confirmPlaceholder="Re-enter your password"
          onValidationChange={setPasswordsValid}
        />

        {state?.message && (
          <Field>
            <FormHeading
              label=""
              errorMessage={state.message}
              validationType="error"
            />
          </Field>
        )}

        <Field className="mt-2">
          <Button
            type={isPending || !passwordsValid ? "button" : "submit"}
            className="w-full"
            aria-disabled={isPending || !passwordsValid}
            data-disabled={isPending || !passwordsValid}
          >
            {isPending ? (
              <>
                <Spinner /> Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </Field>

        <div className="mt-2 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={signInHref} className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </FieldGroup>
    </form>
  );
}

export function SignupContent() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      }
    >
      <SignupContentInner />
    </Suspense>
  );
}
