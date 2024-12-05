'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const formSchema = z.object({
  id: z.string(),
  customerId: z.string(), 
  amount: z.coerce.number(),
  status: z.enum(['panding', 'paid']),
  date: z.string(),
});

const CreateInvoice = formSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  const amountInCent =amount * 100;
  const date = new Date().toISOString().split('T')[0];

  await sql `
    INSERT INTO invoices(customerId, amout, status, date)
    VALUES ${customerId}, ${amountInCent} ${status}, ${date}
  `;

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');

  const rawFormData = {
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  };

  console.log(rawFormData);
}