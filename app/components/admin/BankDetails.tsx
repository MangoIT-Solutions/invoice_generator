'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Save } from 'lucide-react';
import { toast } from 'sonner';
import router from 'next/router';

export default function BankDetails() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    account_number: '',
    bank_name: '',
    bank_address: '',
    swift_code: '',
    ifsc_code: '',
    wire_charges: ''
  });

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      const response = await fetch('/api/admin/bank');
      const data = await response.json();
      if (response.ok && data.bank) {
        setFormData(data.bank);
      }
    } catch (error) {
      toast.error('Failed to fetch bank details');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/bank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Bank details saved successfully');
      } else {
        toast.error(data.error || 'Failed to save bank details');
      }
    } catch (error) {
      toast.error('Network error occurred 644');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bank Details Configuration</h1>
        <p className="text-gray-600">Configure bank details for invoice payments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Banking Information
          </CardTitle>
          <CardDescription>
            These details will appear in the payment section of invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  name="account_number"
                  value={formData.account_number}
                  onChange={handleChange}
                  placeholder="Enter account number"
                  required
                />
              </div>
              <div>
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  placeholder="Enter bank name"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bank_address">Bank Address</Label>
              <Textarea
                id="bank_address"
                name="bank_address"
                value={formData.bank_address}
                onChange={handleChange}
                placeholder="Enter bank address"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="swift_code">SWIFT Code</Label>
                <Input
                  id="swift_code"
                  name="swift_code"
                  value={formData.swift_code}
                  onChange={handleChange}
                  placeholder="Enter SWIFT code"
                  required
                />
              </div>
              <div>
                <Label htmlFor="ifsc_code">IFSC Code</Label>
                <Input
                  id="ifsc_code"
                  name="ifsc_code"
                  value={formData.ifsc_code}
                  onChange={handleChange}
                  placeholder="Enter IFSC code"
                  required
                />
              </div>
              <div>
                <Label htmlFor="wire_charges">Wire Charges ($)</Label>
                <Input
                  id="wire_charges"
                  name="wire_charges"
                  value={formData.wire_charges}
                  onChange={handleChange}
                  placeholder="On Client Side"
                />
              </div>
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
                    Save Bank Details
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