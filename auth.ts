import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    // Credentials provider for email/password authentication
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Validate input
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email },
        });

        // User doesn't exist or no password hash (OAuth-only user)
        if (!user || !user.passwordHash) {
          return null;
        }

        // Verify password using bcrypt
        const isPasswordValid = await bcrypt.compare(
          password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        // Return user object (Auth.js will create session)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allow relative callback URLs (e.g. "/", "/products/foo")
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allow same-origin absolute URLs
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async jwt({ token, user }) {
      // Add user ID to JWT token on sign in
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token, user }) {
      // Add user ID to session
      if (session.user) {
        // For database sessions (OAuth), use user.id
        // For JWT sessions (Credentials), use token.id
        session.user.id = user?.id || (token?.id as string);
      }
      return session;
    },
  },
  session: {
    // Use JWT for credentials, database adapter handles OAuth sessions
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  // Trust the Host header so auth works when accessed via LAN IP, proxies, etc.
  trustHost: true,
  // Add secret explicitly to ensure consistency across restarts
  secret: process.env.AUTH_SECRET,
});
