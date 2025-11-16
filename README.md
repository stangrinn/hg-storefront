# Helena Grisnhpun Art - E-commerce Storefront

> Modern Angular-based e-commerce platform for helenagrisnhpun.art

[![Angular](https://img.shields.io/badge/Angular-16.0.4-DD0031?logo=angular)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.4-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.2.1-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![GraphQL](https://img.shields.io/badge/GraphQL-Apollo%20Client-E10098?logo=graphql)](https://www.apollographql.com/)

## 🎨 About Project

This is a professional e-commerce storefront for Helena Grisnhpun's art gallery, built with Angular and integrated with Vendure e-commerce framework. The application features server-side rendering, progressive web app capabilities, and a modern, responsive design.

### Key Features

- 🛒 **Full E-commerce Functionality** - Product catalog, shopping cart, checkout process
- 👤 **User Account Management** - Registration, authentication, order history
- 📱 **Responsive Design** - Optimized for mobile, tablet, and desktop
- ⚡ **Server-Side Rendering** - Fast initial load and SEO optimization
- 🎨 **Modern UI/UX** - Built with Tailwind CSS
- 🔒 **Secure** - JWT authentication, route guards, and data validation
- 📊 **GraphQL API** - Type-safe data fetching with Apollo Client

## 📊 Project Status

| Metric | Status | Details |
|--------|--------|---------|
| Production Readiness | 🟡 60% | Core features complete, security hardening needed |
| Test Coverage | 🔴 1.5% | Critical: needs improvement to 70%+ |
| Security | 🟡 Medium | CSRF and CSP implementation required |
| Performance | 🟢 Good | SSR enabled, bundle optimization in progress |
| Documentation | 🟢 Complete | Full technical audit available in `/docs` |

> 📋 For detailed analysis, see [Project Technical Audit](./docs/project-analysis.md)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Yarn 1.22+
- Running Vendure backend instance

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd hg-storefront

# Install dependencies
yarn install

# Generate GraphQL types from schema
yarn generate-types
```

### Development

```bash
# Start development server
yarn start
# → http://localhost:4201

# Start with SSR
yarn dev:ssr

# Build for production
yarn build:ssr

# Run tests
yarn test

# Lint code
yarn lint

# Analyze bundle size
yarn analyze-prod-bundle
```

### Environment Configuration

Update the environment files to point to your Vendure backend:

**Development:** `src/environments/environment.ts`
```typescript
export const environment = {
    production: false,
    apiHost: 'http://localhost',
    apiPort: 3000,
    shopApiPath: 'shop-api',
    baseHref: '/',
    tokenMethod: 'bearer',
};
```

**Production:** `src/environments/environment.prod.ts`
```typescript
export const environment = {
    production: true,
    apiHost: 'https://your-api-domain.com',
    apiPort: 443,
    shopApiPath: 'shop-api',
    baseHref: '/',
    tokenMethod: 'cookie', // More secure for production
};
```

## 🏗️ Architecture

### Technology Stack

**Frontend Framework:**
- Angular 16.0.4
- TypeScript 5.0.4
- RxJS 6.6.3

**Styling:**
- Tailwind CSS 3.2.1
- SCSS preprocessor
- Responsive design patterns

**Data Layer:**
- Apollo Client 3.7.15
- GraphQL Code Generator
- Type-safe queries and mutations

**Server-Side Rendering:**
- Angular Universal 16.0.2
- Express server
- State transfer optimization

**Build Tools:**
- Angular CLI 16.0.5
- Webpack (via Angular CLI)
- PostCSS + Autoprefixer

### Project Structure

```
hg-storefront/
├── src/
│   ├── app/
│   │   ├── account/          # User account module
│   │   ├── checkout/         # Checkout process module
│   │   ├── core/             # Core components & services
│   │   ├── shared/           # Shared components & utilities
│   │   └── common/           # Generated types & GraphQL docs
│   ├── assets/               # Static assets
│   ├── environments/         # Environment configurations
│   └── styles/               # Global styles
├── docs/                     # Project documentation
│   ├── project-analysis.md   # Technical audit
│   ├── README.md             # Documentation overview
│   └── checklist.md          # Production readiness tasks
├── server.ts                 # SSR server configuration
└── angular.json              # Angular CLI configuration
```

### Key Modules

**Account Module** (`src/app/account/`)
- User registration and authentication
- Profile management
- Order history
- Address book
- Password recovery

**Checkout Module** (`src/app/checkout/`)
- Multi-step checkout flow
- Shipping method selection
- Payment processing
- Order confirmation

**Core Module** (`src/app/core/`)
- Product catalog and search
- Shopping cart
- Navigation components
- Layout components
- Data services

**Shared Module** (`src/app/shared/`)
- Reusable UI components
- Form components
- Pipes and utilities

## 🔧 Development

### Code Generation

```bash
# Generate GraphQL types from schema
yarn generate-types

# This creates:
# - src/app/common/generated-types.ts
# - src/app/common/introspection-results.ts
```

### Working with GraphQL

All GraphQL queries and mutations are defined in `*.graphql.ts` files:

```typescript
// Example: Product search query
export const SEARCH_PRODUCTS = gql`
    query SearchProducts($input: SearchInput!) {
        search(input: $input) {
            items {
                productId
                productName
                slug
                priceWithTax { ... }
            }
            totalItems
        }
    }
`;

// Usage in component
this.dataService
    .query<SearchProductsQuery>(SEARCH_PRODUCTS, variables)
    .subscribe(data => {
        // Handle results
    });
```

### Testing

```bash
# Run unit tests
yarn test

# Run tests with coverage
yarn test -- --code-coverage

# Run e2e tests
yarn e2e
```

**Note:** Test coverage is currently at 1.5%. See [checklist.md](./docs/checklist.md) for testing improvement plan.

### Code Quality

```bash
# Run linter
yarn lint

# Fix linting issues
yarn lint --fix
```

### Building

```bash
# Development build
yarn build

# Production build with SSR
yarn build:ssr

# Docker production build
yarn build:ssr:docker
```

## 🚢 Deployment

### Production Deployment Steps

1. **Configure Environment**
   - Update `src/environments/environment.prod.ts`
   - Set correct API endpoints
   - Configure `baseHref` to `/`

2. **Update angular.json**
   ```json
   "production": {
     "baseHref": "/",
     "deployUrl": "/"
   }
   ```

3. **Build Application**
   ```bash
   yarn build:ssr
   ```

4. **Deploy Built Artifacts**
   - Built files are in `dist/` directory
   - Run server: `node dist/server/main.js`
   - Server runs on port 4000 by default

5. **Configure Web Server**
   - Point your web server (nginx/apache) to `localhost:4000`
   - Enable HTTPS
   - Configure HSTS headers

### Docker Deployment

```bash
# Build Docker image
docker build -t hg-storefront .

# Run container
docker run -p 4000:4000 hg-storefront
```

### Email Configuration

Configure the Vendure backend `EmailPlugin` to point to storefront routes:

```typescript
EmailPlugin.init({
    globalTemplateVars: {
        fromAddress: '"Helena Grisnhpun Art" <noreply@helenagrisnhpun.art>',
        verifyEmailAddressUrl: 'https://helenagrisnhpun.art/account/verify',
        passwordResetUrl: 'https://helenagrisnhpun.art/account/reset-password',
        changeEmailAddressUrl: 'https://helenagrisnhpun.art/account/change-email-address',
    }
})
```

## 📚 Documentation

Comprehensive documentation is available in the `/docs` directory:

- **[Project Analysis](./docs/project-analysis.md)** - Complete technical audit including:
  - Functionality assessment and readiness level
  - Test coverage analysis
  - Backend integration details with code examples
  - Security analysis and vulnerability assessment
  - Performance recommendations
  - Production roadmap (10-12 weeks)

- **[Development Checklist](./docs/checklist.md)** - Production readiness tasks:
  - Security improvements (~20 tasks)
  - Testing requirements (~15 tasks)
  - Performance optimization
  - Feature completion
  - DevOps setup

- **[Documentation Overview](./docs/README.md)** - Quick reference guide

## 🔐 Security

### Current Security Measures

✅ **Implemented:**
- XSS protection via Angular's built-in sanitization
- Route guards for authentication and authorization
- JWT token-based authentication
- Centralized error handling
- Type-safe GraphQL operations

⚠️ **In Progress:**
- CSRF protection (planned)
- Content Security Policy headers (planned)
- Rate limiting (planned)
- httpOnly cookies for production (configured but needs verification)

🔴 **Critical Action Items:**
- [ ] Implement CSRF protection
- [ ] Configure CSP headers
- [ ] Add rate limiting
- [ ] Conduct security audit
- [ ] Enable HTTPS with HSTS

See [Security Section](./docs/project-analysis.md#4-security-and-potential-risks) for detailed analysis.

## ⚡ Performance

### Current Metrics

- **SSR Enabled:** Yes ✅
- **Bundle Size:** Not optimized (analysis needed)
- **Lazy Loading:** Partially implemented
- **Service Worker:** Disabled (SSR conflict)

### Optimization Roadmap

1. **Bundle Optimization** - Analyze and reduce bundle size
2. **Lazy Loading** - Implement for Account and Checkout modules
3. **Prerendering** - Configure for static pages
4. **Service Worker** - Resolve SSR conflict and enable
5. **Image Optimization** - Implement lazy loading

Run bundle analysis:
```bash
yarn analyze-prod-bundle
```

## 🧪 Testing Strategy

### Current Status
- **Unit Tests:** 1.5% coverage (2 files)
- **Integration Tests:** Not implemented
- **E2E Tests:** Not implemented

### Testing Roadmap

**Phase 1: Unit Tests (Target: 80%)**
- [ ] DataService and API interactions
- [ ] StateService and state management
- [ ] Route guards
- [ ] Business logic services
- [ ] Pipes and utilities

**Phase 2: Integration Tests**
- [ ] Account module flows
- [ ] Checkout process
- [ ] Product catalog

**Phase 3: E2E Tests**
- [ ] Complete purchase flow
- [ ] User registration and login
- [ ] Product search and filtering

See [Testing Section](./docs/checklist.md#-testing) for complete checklist.

## 🛣️ Roadmap

### Phase 1: Security & Stability (2 weeks)
- Implement CSRF protection
- Configure CSP headers
- Add rate limiting
- Security audit
- Switch to httpOnly cookies

### Phase 2: Testing (3 weeks)
- Achieve 80% unit test coverage
- Implement integration tests
- Add E2E tests for critical flows
- Configure CI/CD with coverage gates

### Phase 3: Performance (2 weeks)
- Bundle size optimization
- Lazy loading implementation
- Service Worker activation
- Image optimization

### Phase 4: Features (3 weeks)
- Wishlist functionality
- Product reviews integration
- Newsletter subscription
- Order tracking
- Multilanguage support (i18n)

**Total Timeline:** 10-12 weeks to production-ready

## 🤝 Contributing

### Development Workflow

1. Create a feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the code style guide

3. Write tests for new functionality

4. Run linter and tests
   ```bash
   yarn lint
   yarn test
   ```

5. Commit with descriptive messages
   ```bash
   git commit -m "feat: add wishlist functionality"
   ```

6. Push and create a pull request

### Code Style

- Follow Angular style guide
- Use TypeScript strict mode
- Write descriptive comments
- Keep functions small and focused
- Use meaningful variable names

### Commit Convention

Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Build process or auxiliary tool changes

## 📄 License

MIT

## 👥 Team

**Project:** Helena Grisnhpun Art E-commerce Platform  
**Website:** helenagrisnhpun.art  
**Framework:** [Vendure](https://github.com/vendure-ecommerce/vendure)  
**Based on:** [Vendure Angular Storefront](https://github.com/vendure-ecommerce/storefront-angular-starter)

## 🔗 Links

- **Documentation:** [/docs](./docs/)
- **Vendure Docs:** https://docs.vendure.io
- **Angular Docs:** https://angular.io/docs
- **GraphQL Code Generator:** https://www.graphql-code-generator.com
- **Tailwind CSS:** https://tailwindcss.com

---

**Status:** 🟡 In Development (60% production-ready)  
**Version:** 0.3.1  
**Last Updated:** November 16, 2025
