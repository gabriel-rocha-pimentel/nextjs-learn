'use server';
import { date, z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { auth } from "@/auth";

// Schema de validação para os campos do formulário de criação de cliente
const formSchema = z.object({
  id: z.string().optional(), // Tornar o campo id opcional
  name: z.string({ invalid_type_error: 'Name is required.'}),
  email: z.string({ invalid_type_error: 'Invalid email'}),
  date: date().optional(),
});

export type State = {
  errors?: {
    name?: string[];
    email?: string[];
  };
  message?: string | null;
};

// Função de criação de cliente
export async function createCustomer(prevState: State, formData: FormData) {
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
  const validatedFields = formSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    image_url: formData.get('image_url'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields, Failed to Create Customer.',
    };
  }

  const currentDate = new Date().toISOString();
  const { name, email: customerEmail } = validatedFields.data;

  // Define uma URL padrão para a imagem
  const image_url = 'https://i.ibb.co/W49VCbj6/profile.png';

  try {
    // Insira os dados do cliente no banco de dados, atribuindo o user_id
    await sql`
      INSERT INTO customers (name, email, image_url, user_id, date)
      VALUES (${name}, ${customerEmail}, ${image_url}, ${user_id}, ${currentDate})
    `;
  } catch (error) {
    console.error("Erro ao inserir dados:", error);
    return { message: `Database Error: Failed to Create Customer. The error is:\n${error}` };
  }

  revalidatePath('/dashboard/customers');
  redirect('/dashboard/customers');
}

// Update Customers
const UpdateCustomers = formSchema.omit({id: true, date: true});
export async function updateCustomers(id: string, prevState: State, formData: FormData) {
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

  const validatedFields = UpdateCustomers.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    image_url: formData.get('image_url'),
  });

  if(!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: `Missing Fields, Failed To Update Customer`,
    };
  }

  const currentDate = new Date().toISOString();
  const { name, email: customerEmail } = validatedFields.data;

  // Define uma URL padrão para a imagem
  const image_url = 'https://i.ibb.co/W49VCbj6/profile.png';

  try {
    await sql`
      UPDATE customers
      SET name = ${name}, email = ${customerEmail}, image_url = ${image_url}, date = ${currentDate}
      WHERE id = ${id} AND user_id = ${user_id}
    `;
  } catch (error) {
    console.log(error);
    return { message: `Database Error: Failed To Update Customers.` };
  }

  revalidatePath('/dashboard/customers');
  redirect('/dashboard/customers');
}

// Delete Customers
export async function deleteCustomers(id: string) {
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
    await sql`DELETE FROM customers WHERE id = ${id} AND user_id = ${user_id}`;
    revalidatePath('/dashboard/customers');
    
    return { message: 'Customer deleted successfully!' };
  } catch (error) {
    return { message: `Database Error: Failed To Delete Customer, the error is ${error}.` };
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
