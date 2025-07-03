'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Save } from 'lucide-react';
import { toast } from 'sonner';
import router from 'next/router';

export default function InvoiceConfig() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    starting_number: 1000,
    current_number: 1000
  });

  useEffect(() => {
    fetchInvoiceConfig();
  }, []);

  const fetchInvoiceConfig = async () => {
    try {
      const response = await fetch('/api/admin/invoice-config');
      const data = await response.json();
      if (response.ok && data.config) {
        setFormData(data.config);
      }
    } catch (error) {
      toast.error('Failed to fetch invoice configuration');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/invoice-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Invoice configuration saved successfully');
        router.push('/admin/invoice-config');
      } else {
        toast.error(data.error || 'Failed to save configuration');
      }
    } catch (error) {
      toast.error('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoice Configuration</h1>
        <p className="text-gray-600">Configure invoice numbering and settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Invoice Numbering
          </CardTitle>
          <CardDescription>
            Set the starting invoice number and manage numbering sequence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="starting_number">Starting Invoice Number</Label>
                <Input
                  id="starting_number"
                  name="starting_number"
                  type="number"
                  value={formData.starting_number}
                  onChange={handleChange}
                  placeholder="1000"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  The base number for new invoice sequences
                </p>
              </div>
              <div>
                <Label htmlFor="current_number">Current Invoice Number</Label>
                <Input
                  id="current_number"
                  name="current_number"
                  type="number"
                  value={formData.current_number}
                  onChange={handleChange}
                  placeholder="1000"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  The next invoice number to be generated
                </p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Preview</h4>
              <p className="text-blue-700">
                Next invoice will be numbered: <strong>#{formData.current_number}</strong>
              </p>
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