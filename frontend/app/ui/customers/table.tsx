import Image from 'next/image';
import { UpdateInvoice, DeleteInvoice } from '@/app/ui/invoices/buttons';
import { fetchFilteredCustomers } from '@/app/lib/data';

export default async function CustomersTable({ query }: { query: string; }) {
  const customers = await fetchFilteredCustomers(query);

  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  Name
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Email
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Total Invoices	
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Total Pending
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Total Paid
                </th>
                <th scope="col" className="relative py-3 pl-6 pr-3">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {customers?.map((customer) => (
                <tr
                  key={customer.id}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg">
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="flex items-center gap-3">
                      <Image
                        src={customer.image_url}
                        className="rounded-full"
                        width={28}
                        height={28}
                        alt={`${customer.image_url}'s profile picture`}
                      />
                      <p>{customer.name}</p>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {customer.email}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {customer.total_invoices}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {customer.total_pending}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {customer.total_paid}
                  </td>
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="flex justify-end gap-3">
                      <UpdateInvoice id={customer.id} />
                      <DeleteInvoice id={customer.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
