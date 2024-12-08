'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Schema of form creation 
const formSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }), 
  amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0. '}),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status',
  }),
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

// Create Invoices
const CreateInvoice = formSchema.omit({ id: true, date: true });

export async function createInvoice(prevState: State, formData: FormData) {
  // Validate form using Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // If form validation fails, return errors early. Otherwhise, continue.
  if(!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields, Failed To Create Invoice.',
    };
  } 

  // Prepare data for insertion into the database.
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = Number(amount) * 100;
  const date = new Date().toISOString().split('T')[0];

  // Inser data into database.
  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    // If a database error occurs, return a more especific error.
    return { message: `Database Error: Failed to Create Invoice. The error is:\n${error}` };
  }

  // Revalidate the the cache for the invoices page and redirect the user.
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

// Update Invoices
const UpdateInvoice = formSchema.omit({id: true, date: true});
export async function updateInvoice(id: string, prevState: State, formData: FormData) {

  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if(!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: `Missing Fields, Failed To Update Invoice`,
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCent = Number(amount) * 100;

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCent}, status = ${status}
      WHERE id = ${id}
    `;

  } catch (error) {
    console.log(error);
    return { message: `Database Error: Failed To Update Invoice.` };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

// Delete Invoices
export async function deleteInvoice(id: string) {
  try {
    await sql`DELETE from invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
    
    return { message: 'Delete Invoice sussefull!' };
  } catch (error) {
    return { message: `Database Error: Failed To Delete Invoice, the error is ${error}.` };
  }
}
