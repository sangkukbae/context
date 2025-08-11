# Components Reference

This document provides comprehensive reference for UI components in the Context application.

## Component Library Overview

Context uses **shadcn/ui** as the primary component library, providing:

- **Accessibility**: Built on Radix UI primitives
- **Customization**: Full control over styling and behavior
- **Performance**: Zero runtime overhead (copy-paste architecture)
- **Type Safety**: Complete TypeScript support

## Configuration

Components are configured via `components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  },
  "iconLibrary": "lucide"
}
```

## Available Components

### Layout Components

#### Card (`/components/ui/card.tsx`)

Flexible container component for grouping related content.

```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    Main content goes here
  </CardContent>
  <CardFooter>
    Footer content
  </CardFooter>
</Card>
```

**Props:**

- `className?: string` - Additional CSS classes
- Standard HTML div props

#### Separator (`/components/ui/separator.tsx`)

Visual separator component for dividing content.

```typescript
import { Separator } from '@/components/ui/separator'

<Separator orientation="horizontal" />
<Separator orientation="vertical" className="h-4" />
```

**Props:**

- `orientation?: 'horizontal' | 'vertical'` - Separator direction
- `className?: string` - Additional CSS classes

#### Tabs (`/components/ui/tabs.tsx`)

Tabbed interface component for organizing content.

```typescript
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    Content for tab 1
  </TabsContent>
  <TabsContent value="tab2">
    Content for tab 2
  </TabsContent>
</Tabs>
```

### Interactive Components

#### Button (`/components/ui/button.tsx`)

Primary button component with multiple variants.

```typescript
import { Button } from '@/components/ui/button'

<Button variant="default" size="default">
  Click me
</Button>
```

**Variants:**

- `default` - Primary button style
- `destructive` - For dangerous actions
- `outline` - Outlined button
- `secondary` - Secondary styling
- `ghost` - Minimal styling
- `link` - Link appearance

**Sizes:**

- `default` - Standard size
- `sm` - Small button
- `lg` - Large button
- `icon` - Icon-only button

#### Input (`/components/ui/input.tsx`)

Text input component with consistent styling.

```typescript
import { Input } from '@/components/ui/input'

<Input
  type="text"
  placeholder="Enter text..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

**Props:**

- Standard HTML input props
- `className?: string` - Additional CSS classes

#### Label (`/components/ui/label.tsx`)

Accessible label component for form fields.

```typescript
import { Label } from '@/components/ui/label'

<Label htmlFor="email">Email Address</Label>
<Input id="email" type="email" />
```

**Props:**

- Standard HTML label props
- `className?: string` - Additional CSS classes

### Display Components

#### Badge (`/components/ui/badge.tsx`)

Small status or category indicator.

```typescript
import { Badge } from '@/components/ui/badge'

<Badge variant="default">New</Badge>
<Badge variant="secondary">Updated</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Draft</Badge>
```

**Variants:**

- `default` - Primary badge style
- `secondary` - Muted styling
- `destructive` - Error/warning state
- `outline` - Outlined appearance

#### Progress (`/components/ui/progress.tsx`)

Progress indicator component.

```typescript
import { Progress } from '@/components/ui/progress'

<Progress value={progress} className="w-full" />
```

**Props:**

- `value?: number` - Progress value (0-100)
- `className?: string` - Additional CSS classes

#### Alert (`/components/ui/alert.tsx`)

Alert component for important messages.

```typescript
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

<Alert>
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components to your app using the cli.
  </AlertDescription>
</Alert>
```

**Variants:**

- `default` - Standard alert
- `destructive` - Error/warning alert

#### Tooltip (`/components/ui/tooltip.tsx`)

Hover tooltip component.

```typescript
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent>
      <p>Tooltip content</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Form Components

#### Form (`/components/ui/form.tsx`)

Complete form component system with validation.

```typescript
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const formSchema = z.object({
  username: z.string().min(2).max(50),
})

function MyForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="shadcn" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
```

## Custom Components

### Health Dashboard (`/components/monitoring/health-dashboard.tsx`)

Real-time system health monitoring component.

```typescript
import { HealthDashboard } from '@/components/monitoring/health-dashboard'

<HealthDashboard className="w-full" />
```

**Features:**

- Real-time health status updates
- Service status indicators
- Auto-refresh every 30 seconds
- Responsive design
- Error state handling

**Props:**

- `className?: string` - Additional CSS classes

## Styling Guidelines

### CSS Variables

Components use CSS variables for theming:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  /* ... more variables */
}
```

### Dark Mode

Dark mode is automatically handled via CSS variables:

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark theme variables */
}
```

### Custom Styling

Extend component styles using className:

```typescript
<Button className="bg-gradient-to-r from-purple-500 to-pink-500">
  Custom Button
</Button>
```

## Icon Usage

Components use Lucide React for icons:

```typescript
import { Plus, Search, Settings } from 'lucide-react'

<Button>
  <Plus className="mr-2 h-4 w-4" />
  Add Item
</Button>
```

### Common Icons

- `Plus` - Add actions
- `Search` - Search functionality
- `Settings` - Configuration
- `User` - User-related actions
- `Home` - Navigation
- `Bell` - Notifications
- `Check` - Success states
- `X` - Close/cancel actions
- `AlertCircle` - Warnings
- `Info` - Information

## Accessibility

All components include built-in accessibility features:

### Keyboard Navigation

- Tab navigation support
- Arrow key navigation where appropriate
- Enter/Space key activation

### Screen Reader Support

- Proper ARIA labels and descriptions
- Semantic HTML elements
- Focus management

### Color and Contrast

- WCAG compliant color contrast ratios
- Color-blind friendly palette
- High contrast mode support

## Best Practices

### Component Usage

1. **Import Components Explicitly**:

   ```typescript
   import { Button } from '@/components/ui/button'
   // Not: import * from '@/components/ui'
   ```

2. **Use Semantic HTML**:

   ```typescript
   <Button asChild>
     <Link href="/profile">Profile</Link>
   </Button>
   ```

3. **Provide Accessible Labels**:
   ```typescript
   <Button aria-label="Close dialog">
     <X className="h-4 w-4" />
   </Button>
   ```

### Styling

1. **Use CSS Variables**: Leverage the design system tokens
2. **Responsive Design**: Use Tailwind responsive prefixes
3. **Consistent Spacing**: Use standardized spacing scale
4. **Color Usage**: Stick to the defined color palette

### Performance

1. **Tree Shaking**: Components are optimally tree-shakeable
2. **Bundle Size**: Monitor bundle size impact of new components
3. **Server Components**: Use RSC-compatible patterns where possible

## Adding New Components

To add a new shadcn/ui component:

```bash
pnpm dlx shadcn@latest add <component-name>
```

Example:

```bash
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add dropdown-menu
pnpm dlx shadcn@latest add select
```

## Component Development Guidelines

### Creating Custom Components

1. **Follow shadcn/ui patterns**
2. **Use forwardRef for DOM components**
3. **Include proper TypeScript interfaces**
4. **Support className prop for customization**
5. **Add proper documentation**

Example custom component structure:

```typescript
import * as React from 'react'
import { cn } from '@/lib/utils'

interface CustomComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

const CustomComponent = React.forwardRef<HTMLDivElement, CustomComponentProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <div
        className={cn(
          'base-styles',
          variant === 'outline' && 'outline-styles',
          size === 'sm' && 'small-styles',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

CustomComponent.displayName = 'CustomComponent'

export { CustomComponent }
```

## Testing Components

Use Playwright for component testing:

```typescript
import { test, expect } from '@playwright/test'

test('button renders correctly', async ({ page }) => {
  await page.goto('/test-page')

  const button = page.getByRole('button', { name: 'Click me' })
  await expect(button).toBeVisible()

  await button.click()
  await expect(page.getByText('Button clicked')).toBeVisible()
})
```

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev/)
