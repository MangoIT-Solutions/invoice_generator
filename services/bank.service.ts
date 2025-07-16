// services/bank.service.ts
import { BankDetails } from '@/model/bank-details.model';

export async function getBankDetails() {
  try {
    const result = await BankDetails.findOne();
    if (result) {
      const plain = result.toJSON?.() || result;
      return plain;
    }
    return null;
  } catch (error) {
    console.error('Error fetching bank details:', error);
    return null;
  }
}

export async function updateBankDetails(data: any) {
  try {
    const existing = await getBankDetails();

    if (existing) {
      await BankDetails.update(
        {
          account_number: data.account_number,
          bank_name: data.bank_name,
          bank_address: data.bank_address,
          swift_code: data.swift_code,
          ifsc_code: data.ifsc_code,
          wire_charges: data.wire_charges,
        },
        {
          where: { id: existing.id },
        }
      );
    } else {
      await BankDetails.create({
        account_number: data.account_number,
        bank_name: data.bank_name,
        bank_address: data.bank_address,
        swift_code: data.swift_code,
        ifsc_code: data.ifsc_code,
        wire_charges: data.wire_charges,
      });
    }
  } catch (error) {
    console.error('Error updating bank details:', error);
    throw error;
  }
}
