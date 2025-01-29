'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

// Schema de validação para os campos do formulário de criação de cliente
const formSchema = z.object({
  id: z.string(),
  name: z.string({ invalid_type_error: 'Name is required.'}),
  email: z.string({ invalid_type_error: 'Invalid email'}),
  image_url: z.string({ invalid_type_error: 'Invalid image URL'}),
  date: z.string(),
});

export type State = {
  errors?: {
    name?: string[];
    email?: string[];
    image_url?: string[];
  };
  message?: string | null;
};

// Função de criação de cliente
export async function createCustomer(prevState: State, formData: FormData) {
  // Valida os campos do formulário usando o Zod
  const validatedFields = formSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    image_url: formData.get('image_url'),
  });

  // Se a validação falhar, retorne os erros
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields, Failed to Create Customer.',
    };
  }

  // Prepare os dados para inserção no banco de dados
  const { name, email, image_url } = validatedFields.data;

  try {
    // Insira os dados do cliente no banco de dados
    await sql`
      INSERT INTO customers (name, email, image_url)
      VALUES (${name}, ${email}, ${image_url})
    `;
  } catch (error) {
    // Se ocorrer um erro no banco de dados, retorne uma mensagem de erro específica
    return { message: `Database Error: Failed to Create Customer. The error is:\n${error}` };
  }

  // Revalide o cache da página de clientes e redirecione o usuário
  await revalidatePath('/dashboard/customers');
  redirect('/dashboard/customers');
}

// Update Customers
const UpdateCustomers = formSchema.omit({id: true, date: true});
export async function updateCustomers(id: string, prevState: State, formData: FormData) {

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

  const { name, email, image_url } = validatedFields.data;

  try {
    await sql`
      UPDATE customers
      SET name = ${name}, email = ${email}, image_url = ${image_url}
      WHERE id = ${id}
    `;

  } catch (error) {
    console.log(error);
    return { message: `Database Error: Failed To Update Customers.` };
  }

  await revalidatePath('/dashboard/customers');
  redirect('/dashboard/customers');
}

// Delete Customers
export async function deleteCustomers(id: string) {
  try {
    await sql`DELETE from customers WHERE id = ${id}`;
    revalidatePath('/dashboard/customers');
    
    return { message: 'Delete Customer sussefull!' };
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

