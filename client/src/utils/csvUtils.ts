export const generateCSVExample = (t: any, language: string) => {
  // Define example data based on language
  const examples = {
    en: [
      {
        name: "John",
        lastname: "Doe",
        email: "john.doe@example.com",
        role: "user",
        company_id: "1",
        department_ids: "16",
      },
      {
        name: "Jane",
        lastname: "Smith",
        email: "jane.smith@example.com",
        role: "user",
        company_id: "",
        department_ids: "17",
      },
      {
        name: "Mike",
        lastname: "Johnson",
        email: "mike.johnson@example.com",
        role: "user",
        company_id: "",
        department_ids: "16,18",
      },
      {
        name: "Sarah",
        lastname: "Wilson",
        email: "sarah.wilson@example.com",
        role: "user",
        company_id: "",
        department_ids: "16",
      },
      {
        name: "David",
        lastname: "Brown",
        email: "david.brown@example.com",
        role: "company",
        company_id: "2",
        department_ids: "20",
      },
      {
        name: "Lisa",
        lastname: "Davis",
        email: "lisa.davis@example.com",
        role: "user",
        company_id: "",
        department_ids: "17,18",
      },
      {
        name: "Tom",
        lastname: "Miller",
        email: "tom.miller@example.com",
        role: "admin",
        company_id: "",
        department_ids: "",
      },
    ],
    es: [
      {
        name: "Juan",
        lastname: "Pérez",
        email: "juan.perez@ejemplo.com",
        role: "user",
        company_id: "1",
        department_ids: "16",
      },
      {
        name: "María",
        lastname: "García",
        email: "maria.garcia@ejemplo.com",
        role: "user",
        company_id: "",
        department_ids: "17",
      },
      {
        name: "Carlos",
        lastname: "López",
        email: "carlos.lopez@ejemplo.com",
        role: "user",
        company_id: "",
        department_ids: "16,18",
      },
      {
        name: "Ana",
        lastname: "Martínez",
        email: "ana.martinez@ejemplo.com",
        role: "user",
        company_id: "",
        department_ids: "16",
      },
      {
        name: "Luis",
        lastname: "Rodríguez",
        email: "luis.rodriguez@ejemplo.com",
        role: "company",
        company_id: "2",
        department_ids: "20",
      },
      {
        name: "Carmen",
        lastname: "Fernández",
        email: "carmen.fernandez@ejemplo.com",
        role: "user",
        company_id: "",
        department_ids: "17,18",
      },
      {
        name: "Pedro",
        lastname: "Sánchez",
        email: "pedro.sanchez@ejemplo.com",
        role: "admin",
        company_id: "",
        department_ids: "",
      },
    ],
    fr: [
      {
        name: "Pierre",
        lastname: "Dupont",
        email: "pierre.dupont@exemple.com",
        role: "user",
        company_id: "1",
        department_ids: "16",
      },
      {
        name: "Marie",
        lastname: "Martin",
        email: "marie.martin@exemple.com",
        role: "user",
        company_id: "",
        department_ids: "17",
      },
      {
        name: "Jean",
        lastname: "Bernard",
        email: "jean.bernard@exemple.com",
        role: "user",
        company_id: "",
        department_ids: "16,18",
      },
      {
        name: "Sophie",
        lastname: "Dubois",
        email: "sophie.dubois@exemple.com",
        role: "user",
        company_id: "",
        department_ids: "16",
      },
      {
        name: "Michel",
        lastname: "Thomas",
        email: "michel.thomas@exemple.com",
        role: "company",
        company_id: "2",
        department_ids: "20",
      },
      {
        name: "Catherine",
        lastname: "Robert",
        email: "catherine.robert@exemple.com",
        role: "user",
        company_id: "",
        department_ids: "17,18",
      },
      {
        name: "François",
        lastname: "Petit",
        email: "francois.petit@exemple.com",
        role: "admin",
        company_id: "",
        department_ids: "",
      },
    ],
  };

  const data = examples[language as keyof typeof examples] || examples.en;

  // Helper function to escape CSV fields
  const escapeCSVField = (field: string) => {
    // If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (field.includes(",") || field.includes("\n") || field.includes('"')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  // Create CSV header
  const header = "name,lastname,email,role,company_id,department_ids";

  // Create CSV rows with proper escaping
  const rows = data.map(
    (row) =>
      `${escapeCSVField(row.name)},${escapeCSVField(row.lastname)},${escapeCSVField(row.email)},${escapeCSVField(row.role)},${escapeCSVField(row.company_id)},${escapeCSVField(row.department_ids)}`,
  );

  return [header, ...rows].join("\n");
};

export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
