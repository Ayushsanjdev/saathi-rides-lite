import React, { useState } from "react";
import { View } from "react-native";
import { loginSchema, registerSchema } from "@saathi/contracts";
import { Button, Card, Copy, ErrorMessage, Field, useUI } from "./ui";
export function AuthForm({
  online,
  submit,
}: {
  online: boolean;
  submit: (path: "/login" | "/register", body: unknown) => Promise<void>;
}) {
  const { colors, styles } = useUI();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  async function send() {
    const parsed = (register ? registerSchema : loginSchema).safeParse(
      register
        ? { name, email, password, ...(phone ? { phone } : {}) }
        : { email, password },
    );
    if (!parsed.success) {
      setError(new Error(parsed.error.issues[0].message));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submit(register ? "/register" : "/login", parsed.data);
    } catch (e) {
      setError(
        e instanceof Error ? e : new Error("Sign in failed. Try again."),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <Copy>{register ? "Create your account" : "Welcome back"}</Copy>
      {register && (
        <Field
          label="Full name"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          editable={!busy}
        />
      )}
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        editable={!busy}
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={register ? "new-password" : "current-password"}
        editable={!busy}
      />
      {register && (
        <Field
          label="Mobile number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={10}
          editable={!busy}
        />
      )}
      <ErrorMessage error={error} />
      {!online && <Copy>Check your connection and retry.</Copy>}
      <Button
        title={register ? "Create account" : "Sign in"}
        disabled={!online}
        busy={busy}
        onPress={() => void send()}
      />
      <Button
        secondary
        title={register ? "Already have an account?" : "Create account"}
        disabled={busy}
        onPress={() => {
          setRegister(!register);
          setError(null);
        }}
      />
    </Card>
  );
}
