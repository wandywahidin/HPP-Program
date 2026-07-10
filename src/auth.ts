import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const hasGoogleProvider = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

export const hasDevLogin = process.env.AUTH_DEV_LOGIN === "true";

const providers: NextAuthConfig["providers"] = [];

if (hasGoogleProvider) {
  providers.push(Google);
}

// Login dev tanpa Google — hanya untuk development sebelum kredensial OAuth siap.
if (hasDevLogin) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Login Dev",
      credentials: {},
      async authorize() {
        return prisma.user.upsert({
          where: { email: "dev@local.test" },
          update: {},
          create: { email: "dev@local.test", name: "Dev User" },
        });
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  // JWT agar provider Credentials (login dev) ikut bekerja; Google tetap
  // tersimpan sebagai User + Account di database via adapter.
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
});
