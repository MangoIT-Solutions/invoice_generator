'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Save } from 'lucide-react';
import { toast } from 'sonner';
import router from 'next/router';

export default function CompanyConfig() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    address: string;
    email: string;
    contact: string;
    admin_name: string;
    admin_department: string;
    company_logo: string | File;
    hsn_sac?: string;
  }>({
    name: '',
    address: '',
    email: '',
    contact: '',
    admin_name: '',
    admin_department: '',
    company_logo: '',
    hsn_sac: ''
  });

  useEffect(() => {
    fetchCompanyConfig();
  }, []);

  const fetchCompanyConfig = async () => {
    try {
      const response = await fetch('/api/admin/company');
      const data = await response.json();
      if (response.ok && data.company) {
        setFormData(data.company);
      }
    } catch (error) {
      toast.error('Failed to fetch company configuration');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let logoUrl = formData.company_logo;
      if (formData.company_logo && formData.company_logo instanceof File) {
        const data = new FormData();
        data.append('file', formData.company_logo);
        const uploadRes = await fetch('/api/admin/company/logo', {
          method: 'POST',
          body: data
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.url) {
          logoUrl = uploadData.url.replace(/^\/+/, ''); // remove leading slash
        } else {
          toast.error('Logo upload failed');
        }
      }
      const response = await fetch('/api/admin/company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, company_logo: typeof logoUrl === 'string' ? logoUrl : '' }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Company configuration saved successfully');
      } else {
        toast.error(data.error || 'Failed to save configuration');
      }
    } catch (error) {
      toast.error('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData({ ...formData, company_logo: file });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Configuration</h1>
        <p className="text-gray-600">Configure your company details for invoices</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="mr-2 h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            This information will appear on all generated invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter company name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="contact">Contact Number</Label>
                <Input
                  id="contact"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  placeholder="Enter contact number"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Company Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter company email"
                required
              />
            </div>

            <div>
              <Label htmlFor="address">Company Address</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter complete company address"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="admin_name">Admin Name</Label>
                <Input
                  id="admin_name"
                  name="admin_name"
                  value={formData.admin_name}
                  onChange={handleChange}
                  placeholder="Enter admin name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="admin_department">Admin Department</Label>
                <Input
                  id="admin_department"
                  name="admin_department"
                  value={formData.admin_department}
                  onChange={handleChange}
                  placeholder="Enter admin department"
                  required
                />
              </div>
              <div>
                <Label htmlFor="hsn_sac">HSN / SAC Code</Label>
                <Input
                  id="hsn_sac"
                  name="hsn_sac"
                  value={formData.hsn_sac || ''}
                  onChange={handleChange}
                  placeholder="Enter HSN or SAC code"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="company_logo">Company Logo</Label>
              <Input
                id="company_logo"
                name="company_logo"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
              />
              {formData.company_logo && typeof formData.company_logo === 'string' && (
                <img src={formData.company_logo} alt="Company Logo" className="mt-2 h-16" />
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Save className="mr-2 h-4 w-4" />
                    Save Configuration
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}