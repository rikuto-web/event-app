import { createMemo, createSignal, type Component } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { AuthCard } from "../components/auth/AuthCard";
import { AuthField } from "../components/auth/AuthField";
import { AuthFormAlert } from "../components/auth/AuthFormAlert";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthSubmitButton } from "../components/auth/AuthSubmitButton";
import { ApiError } from "../lib/api";
import { registerAndLogin } from "../lib/auth";
import {
  validateDisplayName,
  validateEmail,
  validatePassword,
} from "../lib/validation";

export const RegisterPage: Component = () => {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [errorMessage, setErrorMessage] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [submitted, setSubmitted] = createSignal(false);

  const displayNameError = createMemo(() =>
    submitted() || displayName() ? validateDisplayName(displayName()) : null,
  );
  const emailError = createMemo(() =>
    submitted() || email() ? validateEmail(email()) : null,
  );
  const passwordError = createMemo(() =>
    submitted() || password() ? validatePassword(password()) : null,
  );

  const canSubmit = createMemo(
    () =>
      !isSubmitting() &&
      !validateDisplayName(displayName()) &&
      !validateEmail(email()) &&
      !validatePassword(password()),
  );

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    setErrorMessage("");
    setSubmitted(true);

    const displayNameMessage = validateDisplayName(displayName());
    const emailMessage = validateEmail(email());
    const passwordMessage = validatePassword(password());
    if (displayNameMessage || emailMessage || passwordMessage) {
      return;
    }

    setIsSubmitting(true);

    try {
      await registerAndLogin({
        display_name: displayName().trim(),
        email: email().trim(),
        password: password(),
      });
      navigate("/events", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else if (error instanceof TypeError) {
        setErrorMessage("サーバーに接続できません。API が起動しているか確認してください。");
      } else {
        setErrorMessage("登録に失敗しました。時間をおいて再度お試しください。");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="新規登録"
        description="登録後、自動的にログインしてイベント一覧へ進みます。"
        footerText="既にアカウントがある方は"
        footerHref="/login"
        footerLinkLabel="ログイン"
      >
        <form class="auth-form" onSubmit={handleSubmit} novalidate>
          <AuthField
            id="display_name"
            label="表示名"
            error={displayNameError()}
            inputProps={{
              name: "display_name",
              maxlength: 50,
              value: displayName(),
              onInput: (event) => setDisplayName(event.currentTarget.value),
            }}
          />
          <AuthField
            id="email"
            label="メールアドレス"
            error={emailError()}
            inputProps={{
              name: "email",
              type: "email",
              autocomplete: "username",
              value: email(),
              onInput: (event) => setEmail(event.currentTarget.value),
            }}
          />
          <AuthField
            id="password"
            label="パスワード（8文字以上）"
            error={passwordError()}
            inputProps={{
              name: "password",
              type: "password",
              autocomplete: "new-password",
              value: password(),
              onInput: (event) => setPassword(event.currentTarget.value),
            }}
          />
          <AuthFormAlert message={errorMessage()} />
          <AuthSubmitButton
            label="登録"
            loadingLabel="登録中..."
            inactive={!canSubmit()}
            loading={isSubmitting()}
          />
        </form>
      </AuthCard>
    </AuthLayout>
  );
};
