import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) return null;
        if (user.isBanned) return null;

        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        // Update last active timestamp
        await prisma.user.update({
          where: { id: user.id },
          data: { lastActiveAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          karma: user.karma,
          profileComplete: user.profileComplete,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.karma = user.karma;
        token.profileComplete = user.profileComplete;
      }
      // Allow session updates (e.g., after karma changes)
      if (trigger === "update" && session) {
        token.role = session.role ?? token.role;
        token.karma = session.karma ?? token.karma;
        if (session.profileComplete !== undefined) {
          token.profileComplete = session.profileComplete;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.karma = token.karma as number;
        session.user.profileComplete = token.profileComplete as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
