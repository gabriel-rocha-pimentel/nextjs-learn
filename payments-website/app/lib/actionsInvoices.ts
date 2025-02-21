'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { auth } from '@/auth';

// Schema of form creation invoices
const formSchema = z.object({
  id: z.string(),
  customerId: z.string({ invalid_type_error: 'Please select a customer.'}),
  amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.'}),
  status: z.enum(['pending', 'paid'], { invalid_type_error: 'Please select an invoice status.'}),
  date: z.string(),
});

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

// Função de criação de fatura
const CreateInvoice = formSchema.omit({ id: true, date: true });
export async function createInvoice(prevState: State, formData: FormData) {
  // Pega o email do usuário logado
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return { message: 'Usuário não autenticado.' };
  }

  // Obtém o user_id a partir do email do usuário logado
  const user = await sql`
    SELECT id FROM users WHERE email = ${email}
  `;
  const user_id = user.rows[0]?.id;
  if (!user_id) {
    return { message: 'Usuário não encontrado.' };
  }

  // Valida os campos do formulário usando o Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields, Failed To Create Invoice.',
    };
  }

  // Prepara os dados para inserção no banco de dados
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = Number(amount) * 100;
  const date = new Date().toISOString().split('T')[0];

  try {
    // Inserir fatura no banco de dados, associando o user_id
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date, user_id)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date}, ${user_id})
    `;
  } catch (error) {
    return { message: `Database Error: Failed to Create Invoice. The error is:\n${error}` };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

// Função de atualização de fatura
const UpdateInvoice = formSchema.omit({ id: true, date: true });
export async function updateInvoice(id: string, prevState: State, formData: FormData) {
  // Pega o email do usuário logado
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return { message: 'Usuário não autenticado.' };
  }

  // Obtém o user_id a partir do email do usuário logado
  const user = await sql`
    SELECT id FROM users WHERE email = ${email}
  `;
  const user_id = user.rows[0]?.id;
  if (!user_id) {
    return { message: 'Usuário não encontrado.' };
  }

  // Valida os campos do formulário usando o Zod
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: `Missing Fields, Failed To Update Invoice`,
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCent = Number(amount) * 100;

  try {
    // Atualiza a fatura no banco de dados apenas para o usuário logado
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCent}, status = ${status}
      WHERE id = ${id} AND user_id = ${user_id}
    `;
  } catch (error) {
    return { message: `Database Error: Failed To Update Invoice, the error is ${error}.` };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

// Função de exclusão de fatura
export async function deleteInvoice(id: string) {
  // Pega o email do usuário logado
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return { message: 'Usuário não autenticado.' };
  }

  // Obtém o user_id a partir do email do usuário logado
  const user = await sql`
    SELECT id FROM users WHERE email = ${email}
  `;
  const user_id = user.rows[0]?.id;
  if (!user_id) {
    return { message: 'Usuário não encontrado.' };
  }

  try {
    // Exclui a fatura no banco de dados associada ao usuário logado
    await sql`DELETE FROM invoices WHERE id = ${id} AND user_id = ${user_id}`;
    revalidatePath('/dashboard/invoices');
    
    return { message: 'Fatura excluída com sucesso!' };
  } catch (error) {
    return { message: `Database Error: Failed To Delete Invoice, the error is ${error}.` };
  }
}

export async function authenticate(prevState: string | undefined, formData: FormData) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if(error instanceof AuthError) {
      switch(error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}
