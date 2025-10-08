import { Company } from "@/database/models/company.model";

export async function getCompanyConfig() {
  try {
    const company = await Company.findOne();

    if (company) {
      const plain = company.get({ plain: true }) as any;
      if (plain.company_logo && !plain.logo) {
        plain.logo = plain.company_logo; 
      }
      return plain;
    }

    return null;
  } catch (error) {
    console.error("Error fetching company config:", error);
    return null;
  }
}

export async function updateCompanyConfig(data: any) {
  try {
    const existing = await Company.findOne();

    if (existing) {
      await existing.update({
        name: data.name,
        address: data.address,
        email: data.email,
        contact: data.contact,
        admin_name: data.admin_name,
        admin_department: data.admin_department,
        company_logo: data.company_logo,
        hsn_sac: data.hsn_sac,
      });
    } else {
      await Company.create({
        name: data.name,
        address: data.address,
        email: data.email,
        contact: data.contact,
        admin_name: data.admin_name,
        admin_department: data.admin_department,
        company_logo: data.company_logo,
        hsn_sac: data.hsn_sac,
      });
    }
  } catch (error) {
    console.error("Error updating company config:", error);
    throw error;
  }
}
