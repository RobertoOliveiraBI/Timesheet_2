import { db } from "./db";
import { users, economicGroups, clients, campaigns, taskTypes } from "@shared/schema";
import { hashPassword } from "./auth";

async function seed() {
  console.log("🌱 Criando dados iniciais...");

  try {
    // Criar usuários de teste
    const hashedPassword = await hashPassword("123mudar");
    
    const [masterUser] = await db.insert(users)
      .values({
        email: "roberto@tractionfy.com",
        password: hashedPassword,
        firstName: "Roberto",
        lastName: "Master",
        role: "MASTER",
        position: "Diretor Geral",
        isManager: true,
        department: "Criação",
        costCenter: "GTodos",
        contractType: "CLT",
        isActive: true,
      })
      .returning()
      .onConflictDoNothing();

    const [colaboradorUser] = await db.insert(users)
      .values({
        email: "roberto@cappei.com",
        password: hashedPassword,
        firstName: "Roberto",
        lastName: "Colaborador",
        role: "COLABORADOR",
        position: "Designer",
        isManager: false,
        managerId: masterUser?.id,
        department: "Design",
        costCenter: "GBrasil",
        contractType: "PJ",
        isActive: true,
      })
      .returning()
      .onConflictDoNothing();

    // Criar grupo econômico
    const [economicGroup] = await db.insert(economicGroups)
      .values({
        name: "Grupo Cappei",
        description: "Grupo econômico principal",
      })
      .returning()
      .onConflictDoNothing();

    if (economicGroup) {
      // Criar cliente
      const [client] = await db.insert(clients)
        .values({
          companyName: "Cappei Marketing LTDA",
          tradeName: "Cappei",
          cnpj: "12.345.678/0001-90",
          email: "contato@cappei.com",
          economicGroupId: economicGroup.id,
          isActive: true,
        })
        .returning()
        .onConflictDoNothing();

      if (client) {
        // Criar campanha
        await db.insert(campaigns)
          .values({
            name: "Campanha Digital 2025",
            description: "Campanha de marketing digital para o ano de 2025",
            clientId: client.id,
            contractStartDate: "2025-01-01",
            contractEndDate: "2025-12-31",
            isActive: true,
          })
          .onConflictDoNothing();
      }
    }

    // Criar tipos de tarefa
    const taskTypeData = [
      { name: "Criação", description: "Desenvolvimento de peças criativas", color: "#3b82f6", isBillable: true },
      { name: "Reunião", description: "Reuniões com clientes e equipe", color: "#10b981", isBillable: true },
      { name: "Planejamento", description: "Planejamento estratégico", color: "#f59e0b", isBillable: true },
      { name: "Revisão", description: "Revisão de materiais", color: "#ef4444", isBillable: true },
      { name: "Administrativo", description: "Atividades administrativas", color: "#6b7280", isBillable: false },
    ];

    for (const taskType of taskTypeData) {
      await db.insert(taskTypes)
        .values(taskType)
        .onConflictDoNothing();
    }

    console.log("✅ Dados iniciais criados com sucesso!");
    console.log("👤 Usuários de teste:");
    console.log("   Master: roberto@tractionfy.com / 123mudar");
    console.log("   Colaborador: roberto@cappei.com / 123mudar");

  } catch (error) {
    console.error("❌ Erro ao criar dados iniciais:", error);
  }
}

// Execute seed if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed().then(() => process.exit(0));
}

export { seed };