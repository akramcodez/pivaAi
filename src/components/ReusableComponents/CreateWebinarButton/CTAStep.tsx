'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWebinarStore } from '@/store/useWebinarStore';
import { cn } from '@/lib/utils';
import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { CtaTypeEnum, Product, ProductStatusEnum } from '@prisma/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Stripe from 'stripe';
import { ClientProduct } from '@/lib/type';
import { Assistant } from '@vapi-ai/server-sdk/api';
import Link from 'next/link';

type Props = {
  stripeProducts: ClientProduct[] | [];
  assistants: Assistant[] | [];
};

const CTAStep = ({ stripeProducts, assistants }: Props) => {
  const { formData, updateCTA, addTag, removeTag, getStepvalidationError } =
    useWebinarStore();
  const { ctaLabel, tags, aiAgent, priceId, ctaType } = formData.cta;
  const [tagInput, setTagInput] = useState('');
  const errors = getStepvalidationError('cta');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateCTA(name as keyof typeof formData.cta, value);
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput.trim());
      setTagInput('');
    }
  };

  const handleSelectCTAType = (value: string) => {
    updateCTA('ctaType', value as CtaTypeEnum);
  };

  const handleProductChange = (value: string) => {
    updateCTA('priceId', value);
  };

  const handleSelectAgent = (value: string) => {
    updateCTA('aiAgent', value);
  };

  const activeStripeProducts = stripeProducts.filter(
    (product) => product.status === ProductStatusEnum.ACTIVE,
  );

  return (
    <div className="space-y-4 md:space-y-4">
      <div className="space-y-2">
        <Label
          htmlFor="ctaLabel"
          className={errors.ctaLabel ? 'text-red-400' : ''}
        >
          CTA Label <span className="text-red-400">*</span>
        </Label>
        <Input
          id="ctaLabel"
          name="ctaLabel"
          value={ctaLabel || ''}
          onChange={handleChange}
          placeholder="Let's Get Started"
          className={cn(
            '!bg-background/50 border border-input',
            errors.ctaLabel && 'border-red-400 focus-visible:ring-red-400',
          )}
        />
        {errors.ctaLabel && (
          <p className="text-sm text-red-400">{errors.ctaLabel}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags" className={errors.ctaLabel ? 'text-red-400' : ''}>
          CTA Tags <span className="text-red-400">*</span>
        </Label>
        <Input
          id="tags"
          name="tags"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          placeholder="Add Tags and press Enter"
          className="!bg-background/50 border border-input"
        />
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag: string, index: number) => (
              <div
                key={index}
                className="flex items-center gap-1 bg-gray-800 text-white px-3 py-1 rounded-md"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 w-full">
        <Label>CTA Type</Label>
        <Tabs defaultValue={CtaTypeEnum.BOOK_A_CALL} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger
              value={CtaTypeEnum.BOOK_A_CALL}
              className="w-1/2 date-[state=active]:!bg-background/50"
              onClick={() => handleSelectCTAType(CtaTypeEnum.BOOK_A_CALL)}
            >
              Book a Call
            </TabsTrigger>
            <TabsTrigger
              value={CtaTypeEnum.BUY_NOW}
              className="w-1/2"
              onClick={() => handleSelectCTAType(CtaTypeEnum.BUY_NOW)}
            >
              Buy Now
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {ctaType === CtaTypeEnum.BOOK_A_CALL && (
        <div className="space-y-2">
          <Label>Attach an Ai Agent</Label>
          <div className="relative">
            <div className="mb-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4" />
                <Input
                  placeholder="Search Agent"
                  className="pl-9 !bg-background/50 border border-input"
                />
              </div>
            </div>
            <Select value={aiAgent} onValueChange={handleSelectAgent}>
              <SelectTrigger className="w-full !bg-background/50 border border-input">
                <SelectValue placeholder="Select an Agent" />
              </SelectTrigger>

              <SelectContent className="bg-background border border-input max-h-40">
                {assistants?.length > 0 ? (
                  assistants.map((assistant) => (
                    <SelectItem
                      key={assistant.id}
                      value={assistant.id}
                      className="!bg-background/50 hover:!bg-white/10"
                    >
                      {assistant.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="No Agent Available" disabled>
                    No Agents Available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Attach an Product</Label>
        <div className="relative">
          <div className="mb-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search Product"
                className="pl-9 !bg-background/50 border border-input"
              />
            </div>
          </div>

          <Select value={priceId} onValueChange={handleProductChange}>
            <SelectTrigger className="w-full !bg-background/50 border border-input">
              <SelectValue placeholder="Select an product" />
            </SelectTrigger>
            <SelectContent className="bg-background border border-input max-h-48">
              {activeStripeProducts?.length > 0 ? (
                activeStripeProducts.map((product) => (
                  <SelectItem
                    key={product.id}
                    value={product.id}
                    className="!bg-background/50 hover:!bg-white/10"
                  >
                    {product.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-products" disabled>
                  <Link href={'/products'}>Create product</Link>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default CTAStep;
