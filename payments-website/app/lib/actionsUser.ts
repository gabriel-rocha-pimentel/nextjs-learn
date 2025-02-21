'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs'; // Importando bcrypt para hashing da senha
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

// Schema de validação do formulário de criação de usuário
const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),  // Validação de nome
  email: z.string().email({ message: 'Please enter a valid email address.' }),  // Validação de email
  password: z.string().min(6, { message: 'Password must be at least 6 characters long.' }), // Validação de senha
  created_at: z.string(),
});

export type State = {
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
  message?: string | null;
};

// Removendo 'id' e 'created_at' do schema para criação de usuário
const CreateUser = formSchema.omit({ created_at: true });

export async function createUser(formData: FormData) {

  // Validação dos dados do formulário usando o Zod
  const validatedFields = CreateUser.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  
  // Se a validação falhar, retorna os erros
  if(!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields, Failed To Create User.',
    };
  }
  
  // Extrai os dados validados
  const { name, email, password } = validatedFields.data;

  // Fazendo o hash da senha
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insere os dados no banco de dados
  try {
    await sql`
      INSERT INTO users (name, email, password)
      VALUES (${name}, ${email}, ${hashedPassword})
    `;
  } catch (error) {
    // Se ocorrer um erro no banco de dados, retorna uma mensagem de erro
    return { message: `Database Error: Failed to Create User. The error is:\n${error}` };
  }

  // Revalida o cache e redireciona o usuário para a página de login
  revalidatePath('/dashboard/login');
  redirect('/dashboard/login');
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
