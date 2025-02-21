import { sql } from "@vercel/postgres";
import { auth } from "@/auth";
import {
  User,
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from "./definitions";
import { formatCurrency } from "./utils";

// Função para obter o usuário autenticado
export async function getAuthenticatedUser() {
  const session = await auth();

  if (!session || !session.user?.email) {
    throw new Error("Usuário não autenticado.");
  }

  try {
    const data = await sql<User>`SELECT id, name FROM users WHERE email = ${session.user.email};`;
    return data.rows[0];
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch user.");
  }
}

export async function fetchRevenue() {
  try {
    const data = await sql<Revenue>`SELECT * FROM revenue`;
    return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}


/* Buscar receita (Revenue) do usuário autenticado
export async function fetchRevenue() {
  const user = await getAuthenticatedUser();

  try {
    const data = await sql<Revenue>`SELECT * FROM revenue WHERE user_id = ${user.id};`;
    return data.rows;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch revenue data.");
  }
}

*/

// Buscar as últimas faturas do usuário autenticado
export async function fetchLatestInvoices() {
  const user = await getAuthenticatedUser();

  try {
    const data = await sql<LatestInvoiceRaw>`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE invoices.user_id = ${user.id}
      ORDER BY invoices.date DESC
      LIMIT 5
    `;

    return data.rows.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the latest invoices.");
  }
}

// Buscar estatísticas de faturas e clientes do usuário autenticado
export async function fetchCardData() {
  const user = await getAuthenticatedUser();

  try {
    const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices WHERE user_id = ${user.id}`;
    const customerCountPromise = sql`SELECT COUNT(*) FROM customers WHERE user_id = ${user.id}`;
    const invoiceStatusPromise = sql`
      SELECT
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
      FROM invoices WHERE user_id = ${user.id}
    `;

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    return {
      numberOfCustomers: Number(data[1].rows[0].count ?? "0"),
      numberOfInvoices: Number(data[0].rows[0].count ?? "0"),
      totalPaidInvoices: formatCurrency(data[2].rows[0].paid ?? "0"),
      totalPendingInvoices: formatCurrency(data[2].rows[0].pending ?? "0"),
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch card data.");
  }
}

const ITEMS_PER_PAGE = 6;

// Buscar faturas filtradas do usuário autenticado
export async function fetchFilteredInvoices(query: string, currentPage: number) {
  const user = await getAuthenticatedUser();
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await sql<InvoicesTable>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE invoices.user_id = ${user.id} AND (
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      )
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    return invoices.rows;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoices.");
  }
}

// Buscar número total de páginas de faturas do usuário autenticado
export async function fetchInvoicesPages(query: string) {
  const user = await getAuthenticatedUser();

  try {
    const count = await sql`
      SELECT COUNT(*) FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE invoices.user_id = ${user.id} AND (
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      )
    `;

    return Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch total number of invoices.");
  }
}

// Buscar uma fatura pelo ID do usuário autenticado
export async function fetchInvoiceById(id: string) {
  const user = await getAuthenticatedUser();

  try {
    const data = await sql<InvoiceForm>`
      SELECT id, customer_id, amount, status FROM invoices
      WHERE id = ${id} AND user_id = ${user.id}
    `;

    return data.rows.length > 0 ? { ...data.rows[0], amount: data.rows[0].amount / 100 } : null;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoice.");
  }
}

// Buscar um cliente pelo ID do usuário autenticado
export async function fetchCustomerById(id: string) {
  const user = await getAuthenticatedUser();

  try {
    const data = await sql<CustomerField>`
      SELECT id, name, email, image_url FROM customers
      WHERE id = ${id} AND user_id = ${user.id}
    `;

    return data.rows.length > 0 ? data.rows[0] : null;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch customer.");
  }
}

// Buscar todos os clientes do usuário autenticado
export async function fetchCustomers() {
  const user = await getAuthenticatedUser();

  try {
    const data = await sql<CustomerField>`
      SELECT id, name, email, image_url FROM customers
      WHERE user_id = ${user.id}
      ORDER BY name ASC
    `;

    return data.rows;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch all customers.");
  }
}

// Buscar clientes filtrados do usuário autenticado
export async function fetchFilteredCustomers(query: string) {
  const user = await getAuthenticatedUser();

  try {
    const data = await sql<CustomersTableType>`
      SELECT
        customers.id, customers.name, customers.email, customers.image_url,
        COUNT(invoices.id) AS total_invoices,
        SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
        SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
      FROM customers
      LEFT JOIN invoices ON customers.id = invoices.customer_id
      WHERE customers.user_id = ${user.id} AND (
        customers.name ILIKE ${`%${query}%`} OR customers.email ILIKE ${`%${query}%`}
      )
      GROUP BY customers.id, customers.name, customers.email, customers.image_url
      ORDER BY customers.name ASC
    `;

    return data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch customer table.");
  }
}
