import { ZodProvider } from '@autoform/zod';
import { z } from 'zod';

import { AutoForm } from '~/components/ui/autoform/tanstack-form';

const jsonSchema = {
  type: 'object',
  title: 'Profile',
  description: 'Demo schema covering many JSON Schema field types',
  properties: {
    // string
    fullName: {
      type: 'string',
      title: 'Full Name',
      description: 'Your legal name',
      minLength: 2,
      maxLength: 80,
    },
    // string formats
    email: {
      type: 'string',
      format: 'email',
      title: 'Email',
    },
    website: {
      type: 'string',
      format: 'uri',
      title: 'Website',
    },
    userId: {
      type: 'string',
      format: 'uuid',
      title: 'User ID',
    },
    birthday: {
      type: 'string',
      format: 'date',
      title: 'Birthday',
      description: 'ISO date (YYYY-MM-DD)',
    },
    lastLogin: {
      type: 'string',
      format: 'date-time',
      title: 'Last Login',
    },
    bio: {
      type: 'string',
      title: 'Bio',
      maxLength: 500,
      default: '',
    },
    // number / integer
    age: {
      type: 'integer',
      title: 'Age',
      minimum: 0,
      maximum: 120,
    },
    rating: {
      type: 'number',
      title: 'Rating',
      minimum: 0,
      maximum: 5,
      multipleOf: 0.5,
      default: 2.5,
    },
    // boolean
    isActive: {
      type: 'boolean',
      title: 'Active',
      default: true,
    },
    acceptTerms: {
      type: 'boolean',
      title: 'Accept Terms',
      description: 'You must accept to continue',
    },
    // enum → select
    role: {
      type: 'string',
      title: 'Role',
      enum: ['admin', 'editor', 'viewer'],
      default: 'viewer',
    },
    theme: {
      type: 'string',
      title: 'Theme',
      enum: ['system', 'light', 'dark'],
    },
    // nested object
    address: {
      type: 'object',
      title: 'Address',
      properties: {
        street: { type: 'string', title: 'Street' },
        city: { type: 'string', title: 'City' },
        zip: { type: 'string', title: 'ZIP', pattern: '^[0-9]{5}(-[0-9]{4})?$' },
        country: {
          type: 'string',
          title: 'Country',
          enum: ['US', 'CA', 'MX', 'GB'],
          default: 'US',
        },
      },
      required: ['street', 'city', 'country'],
    },
    // array of strings
    tags: {
      type: 'array',
      title: 'Tags',
      items: { type: 'string', minLength: 1 },
      minItems: 0,
      maxItems: 10,
      uniqueItems: true,
    },
    // array of objects
    guests: {
      type: 'array',
      title: 'Guests',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
          age: { type: 'integer', title: 'Age', minimum: 0 },
          vegetarian: { type: 'boolean', title: 'Vegetarian', default: false },
        },
        required: ['name'],
      },
    },
    // optional nullable-ish via anyOf
    nickname: {
      anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }],
      title: 'Nickname',
      description: 'Optional; can be null',
    },
  },
  required: ['fullName', 'email', 'role', 'acceptTerms'],
  additionalProperties: false,
} satisfies z.core.JSONSchema.JSONSchema;

const schema = z.fromJSONSchema(jsonSchema) as z.ZodObject;
const schemaProvider = new ZodProvider(schema);

export default function AutoformDemo() {
  return (
    <div className="flex w-full max-w-lg min-w-0 flex-col gap-4 text-sm leading-loose">
      <div>
        <h1 className="text-xl font-bold">AutoForm Demo</h1>
      </div>
      <AutoForm schema={schemaProvider} withSubmit />
    </div>
  );
}
