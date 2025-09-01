import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import { mssqlStorage as storage } from "./storage-mssql";
import { User as SelectUser } from "@shared/schema";
// Temporarily use memory store for sessions until SQL Server sessions are configured
import MemoryStore from "memorystore";

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

const MemStore = MemoryStore(session);

// Middleware to check authentication
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

export function setupAuth(app: Express) {
  app.use(
    session({
      store: new MemStore({
        checkPeriod: 86400000, // prune expired entries every 24h
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
          if (!user) {
            console.log('Login falhou: usuário não encontrado para email:', email);
            return done(null, false, { message: 'Email ou senha incorretos' });
          }
          
          if (!(await comparePasswords(password, user.password))) {
            console.log('Login falhou: senha incorreta para email:', email);
            return done(null, false, { message: 'Email ou senha incorretos' });
          }
          
          console.log('Login bem-sucedido para email:', email);
          return done(null, user);
        } catch (error) {
          console.error('Erro no login:', error);
          return done(new Error('Erro interno do servidor. Verifique a conexão com o banco de dados.'));
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

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        
        // Provide user-friendly error messages
        if (err.message.includes('Invalid column name')) {
          return res.status(500).json({ 
            message: "Erro de configuração do banco de dados. As tabelas não estão configuradas corretamente no SQL Server.",
            details: "Contacte o administrador do sistema."
          });
        }
        if (err.message.includes('timeout')) {
          return res.status(500).json({ 
            message: "Timeout na conexão com o banco de dados. Tente novamente em alguns instantes.",
          });
        }
        if (err.message.includes('MSSQL_URL')) {
          return res.status(500).json({ 
            message: "Configuração de banco de dados ausente. Contacte o administrador.",
          });
        }
        
        return res.status(500).json({ 
          message: "Erro interno do servidor. Se o problema persistir, contacte o suporte.",
          details: err.message 
        });
      }
      if (!user) {
        return res.status(401).json({ 
          message: info?.message || "Email ou senha incorretos" 
        });
      }
      req.logIn(user, async (err) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ 
            message: "Erro ao criar sessão de usuário",
            details: err.message 
          });
        }
        
        // Execute daily backup if needed
        try {
          const { runDailyBackupIfNeeded } = await import('./backup');
          const backupResult = await runDailyBackupIfNeeded();
          
          if (backupResult.ran) {
            console.log(`[LOGIN] ✅ Backup diário executado para ${user.email} - ${backupResult.date}`);
          } else {
            console.log(`[LOGIN] ℹ️  Backup diário: ${'reason' in backupResult ? backupResult.reason : 'não necessário'} (${user.email})`);
          }
        } catch (backupError) {
          console.error(`[LOGIN] ⚠️  Erro no backup diário para ${user.email}:`, backupError);
          // Don't block login due to backup failure
        }
        
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  // Get current user
  app.get("/api/user", requireAuth, async (req, res) => {
    try {
      // Get enriched user data with department and manager info
      const enrichedUser = await storage.getUser((req.user as any).id);
      
      if (!enrichedUser) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      
      const { password, ...userWithoutPassword } = enrichedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching enriched user data:", error);
      
      // Provide specific error messages
      if (error instanceof Error && error.message.includes('Invalid column name')) {
        return res.status(500).json({ 
          error: "Erro de configuração do banco de dados",
          message: "As tabelas do usuário não estão configuradas corretamente."
        });
      }
      
      // Fallback to basic user data
      const { password, ...userWithoutPassword } = req.user as any;
      res.json(userWithoutPassword);
    }
  });
}

export { hashPassword };