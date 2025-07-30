import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import ConnectPgSimple from "connect-pg-simple";
import { pool } from "./db";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

async function comparePasswords(supplied: string, stored: string) {
  return bcrypt.compare(supplied, stored);
}

const PgSession = ConnectPgSimple(session);

export function setupAuth(app: Express) {
  app.use(
    session({
      store: new PgSession({
        pool: pool,
        tableName: "sessions",
        createTableIfMissing: false, // Don't auto-create table since we manage it with Drizzle
      }),
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'email', passwordField: 'password' },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false);
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        done(null, false);
        return;
      }
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error);
    }
  });

  // Register endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já está em uso" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || "COLABORADOR",
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName,
          role: user.role 
        });
      });
    } catch (error) {
      console.error("Erro no registro:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });





  // Login endpoint with email/password
  app.post("/api/login", async (req, res, next) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }

    try {
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }

      // Check password
      const isValidPassword = await comparePasswords(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }

      // Log the user in
      req.login(user, (err) => {
        if (err) {
          console.error("Erro no login:", err);
          return next(err);
        }
        
        // Return user data (excluding password)
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Erro no login:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Logout endpoints
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        console.error("Erro no logout:", err);
        return next(err);
      }
      req.session.destroy((err) => {
        if (err) {
          console.error("Erro ao destruir sessão:", err);
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logout realizado com sucesso" });
      });
    });
  });

  app.get("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        console.error("Erro no logout:", err);
        return next(err);
      }
      req.session.destroy((err) => {
        if (err) {
          console.error("Erro ao destruir sessão:", err);
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
      });
    });
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    // Return user data without sensitive information
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });
}

export { hashPassword };