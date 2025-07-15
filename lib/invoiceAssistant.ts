import { parseWithLLM } from "../services/project-details.service";

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoiceDetails {
  projectCode: string;
  clientName: string;
  period: string;
  items: InvoiceItem[];
  subtotal: number;
  total: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
}

export type AssistantState =
  | { step: 'gather_details', collected: Partial<InvoiceDetails> }
  | { step: 'confirm_details', invoice: InvoiceDetails }
  | { step: 'collect_email', invoice: InvoiceDetails }
  | { step: 'complete' };

export class InvoiceAssistant {
  private state: AssistantState;

  constructor() {
    this.state = { step: 'gather_details', collected: {} };
  }

  async processMessage(message: string): Promise<{ reply: string; state: AssistantState }> {
    try {
      if (this.state.step === 'gather_details') {
        return await this.handleGatherDetails(message);
      } else if (this.state.step === 'confirm_details') {
        return await this.handleConfirmDetails(message);
      } else if (this.state.step === 'collect_email') {
        return await this.handleCollectEmail(message);
      }

      return {
        reply: "I'm not sure what to do next. Let's start over.",
        state: { step: 'gather_details', collected: {} }
      };
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        reply: "I'm sorry, I encountered an error. Let's try that again.",
        state: this.state
      };
    }
  }

  private async handleGatherDetails(message: string) {
    if (this.state.step !== 'gather_details') {
      throw new Error("Invalid state: handleGatherDetails called when not gathering details.");
    }
    const current = this.state.collected;
    const parsed = await parseWithLLM(message);

    // Update collected data with parsed information
    const updated: Partial<InvoiceDetails> = {
      ...current,
      ...(parsed.projectCode && { projectCode: parsed.projectCode }),
      ...(parsed.clientName && { clientName: parsed.clientName }),
      ...(parsed.period && { period: parsed.period }),
      ...(parsed.items && {
        items: parsed.items.map((item: any) => ({
          ...item,
          amount: typeof item.amount === "number" ? item.amount : (item.quantity && item.rate ? item.quantity * item.rate : 0)
        }))
      })
    };

    // Check if we have all required information
    if (this.hasAllRequiredInfo(updated)) {
      const invoice = this.prepareInvoice(updated as Required<InvoiceDetails>);
      this.state = { step: 'confirm_details', invoice };
      return {
        reply: this.formatConfirmation(invoice),
        state: this.state
      };
    }

    // Ask for missing information
    const missing = this.getMissingInfo(updated);
    this.state = { step: 'gather_details', collected: updated };

    return {
      reply: `I need a bit more information to create your invoice. Could you please provide: ${missing.join(', ')}?`,
      state: this.state
    };
  }

  private async handleConfirmDetails(message: string) {
    const lowerMsg = message.toLowerCase().trim();
    if (['yes', 'y', 'correct', 'confirm'].includes(lowerMsg)) {
      const invoice = (this.state as { invoice: InvoiceDetails }).invoice;
      this.state = { step: 'collect_email', invoice };
      return {
        reply: "Great! Please provide the email address where I should send the invoice:",
        state: this.state
      };
    } else if (['no', 'n', 'change'].some(word => lowerMsg.includes(word))) {
      // Extract invoice from state before using it
      const invoice = (this.state as { invoice: InvoiceDetails }).invoice;
      this.state = { step: 'gather_details', collected: invoice };
      return {
        reply: "What would you like to change? Please provide the updated information.",
        state: this.state
      };
    }

    return {
      reply: "Please confirm if these details are correct (yes/no) or tell me what needs to be changed.",
      state: this.state
    };
  }

  private async handleCollectEmail(message: string) {
    const email = message.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return {
        reply: "That doesn't look like a valid email address. Please try again:",
        state: this.state
      };
    }

    this.state = { step: 'complete' };
    return {
      reply: `✅ Invoice has been sent to ${email}! Is there anything else I can help you with?`,
      state: this.state
    };
  }

  private hasAllRequiredInfo(details: Partial<InvoiceDetails>): details is InvoiceDetails {
    return !!(details.projectCode && details.clientName && details.period && details.items?.length);
  }

  private getMissingInfo(details: Partial<InvoiceDetails>): string[] {
    const missing: string[] = [];
    if (!details.projectCode) missing.push('project code');
    if (!details.clientName) missing.push('client name');
    if (!details.period) missing.push('invoice period');
    if (!details.items?.length) missing.push('at least one item');
    return missing;
  }

  private prepareInvoice(details: Required<InvoiceDetails>): InvoiceDetails {
    const subtotal = details.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const taxAmount = details.taxRate ? (subtotal * details.taxRate / 100) : 0;
    const discount = details.discount || 0;
    const total = subtotal + taxAmount - discount;

    return {
      ...details,
      subtotal,
      taxAmount,
      total,
      items: details.items.map(item => ({
        ...item,
        amount: item.quantity * item.rate
      }))
    };
  }

  private formatConfirmation(invoice: InvoiceDetails): string {
    const items = invoice.items.map(item =>
      `- ${item.quantity} x ${item.description} @ $${item.rate.toFixed(2)} = $${(item.quantity * item.rate).toFixed(2)}`
    ).join('\n');

    return `Please confirm these details:\n\n` +
      `Project: ${invoice.projectCode}\n` +
      `Client: ${invoice.clientName}\n` +
      `Period: ${invoice.period}\n\n` +
      `Items:\n${items}\n\n` +
      `Subtotal: $${invoice.subtotal.toFixed(2)}\n` +
      (invoice.taxAmount ? `Tax (${invoice.taxRate}%): $${invoice.taxAmount.toFixed(2)}\n` : '') +
      (invoice.discount ? `Discount: $${invoice.discount.toFixed(2)}\n` : '') +
      `Total: $${invoice.total.toFixed(2)}\n\n` +
      `Is this correct? (yes/no)`;
  }
}
