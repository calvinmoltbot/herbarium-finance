"use client";

import { useTransition } from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { resetPassword } from "../actions";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";

const resetSchema = z.object({
  email: z
    .string({ required_error: "email is required" })
    .email({ message: "invalid email format" })
    .min(11),
});

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof resetSchema>) {
    startTransition(async () => {
      const response = await resetPassword(values.email);

      if (response?.error) {
        toast.error("Something went wrong!");
        return;
      }

      toast.success("Password reset email sent! Check your inbox.");
      form.reset();
    });
  }

  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-1 lg:px-0">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Reset your password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>
        <div className="grid gap-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="example@mail.com"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full mt-8" disabled={isPending}>
                {isPending ? (
                  <div className="flex items-center justify-center gap-1">
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  "Send Reset Email"
                )}
              </Button>
            </form>
          </Form>
          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
