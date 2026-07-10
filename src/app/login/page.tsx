import { redirect } from "next/navigation";
import { auth, signIn, hasGoogleProvider, hasDevLogin } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
            <Calculator className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">HPP Program</CardTitle>
          <CardDescription>
            Hitung Harga Pokok Penjualan produk Anda dengan metode FIFO
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {hasGoogleProvider && (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
              }}
            >
              <Button type="submit" className="w-full">
                Masuk dengan Google
              </Button>
            </form>
          )}
          {hasDevLogin && (
            <form
              action={async () => {
                "use server";
                await signIn("dev", { redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="outline" className="w-full">
                Login Dev (tanpa Google)
              </Button>
            </form>
          )}
          {!hasGoogleProvider && !hasDevLogin && (
            <p className="text-center text-sm text-neutral-500">
              Belum ada provider login yang dikonfigurasi. Isi AUTH_GOOGLE_ID &
              AUTH_GOOGLE_SECRET, atau set AUTH_DEV_LOGIN=true di file .env.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
