# Privacy Components - Quick Start Guide

## 🚀 5-Minute Integration

### Step 1: Wrap Your App with PrivacyProvider

```tsx
// In your main App.tsx or layout component
import { PrivacyProvider } from './context/PrivacyContext';

function App() {
  return (
    <PrivacyProvider>
      <YourExistingApp />
    </PrivacyProvider>
  );
}
```

### Step 2: Add Privacy Mode Toggle to Header

```tsx
// In your Header component
import { usePrivacy } from '../context/PrivacyContext';
import { Eye, EyeOff } from 'lucide-react';

function Header() {
  const { isPrivacyModeEnabled, togglePrivacyMode } = usePrivacy();
  
  return (
    <header>
      {/* Your existing header content */}
      
      <button
        onClick={togglePrivacyMode}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
          isPrivacyModeEnabled ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
        }`}
      >
        {isPrivacyModeEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
        <span>Privacy Mode: {isPrivacyModeEnabled ? 'ON' : 'OFF'}</span>
      </button>
    </header>
  );
}
```

### Step 3: Add Security Dashboard Button

```tsx
import { SecurityDashboard } from '../components/SecurityDashboard';
import { Shield } from 'lucide-react';

function YourPage() {
  const [showDashboard, setShowDashboard] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowDashboard(true)}>
        <Shield size={20} />
        Security Dashboard
      </button>
      
      <SecurityDashboard 
        isOpen={showDashboard} 
        onClose={() => setShowDashboard(false)} 
      />
    </>
  );
}
```

### Step 4: Display Traces with Privacy Protection

```tsx
import { TraceDetailView } from '../components/TraceDetailView';

function TracesList() {
  const [selectedTrace, setSelectedTrace] = useState(null);
  
  return (
    <>
      {traces.map(trace => (
        <div onClick={() => setSelectedTrace(trace)}>
          {trace.name}
        </div>
      ))}
      
      {selectedTrace && (
        <TraceDetailView 
          trace={selectedTrace} 
          onClose={() => setSelectedTrace(null)} 
        />
      )}
    </>
  );
}
```

---

## 🎨 Common Patterns

### Pattern 1: Mask Sensitive Fields in Tables

```tsx
import { MaskedField } from '../components/MaskedField';

function TracesTable({ traces }) {
  return (
    <table>
      <tbody>
        {traces.map(trace => (
          <tr key={trace.id}>
            <td>{trace.name}</td>
            <td>
              <MaskedField 
                value={trace.user_id} 
                fieldId={`user-${trace.id}`} 
                piiType="email" 
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Pattern 2: Show DP Badge on Evaluations

```tsx
import { VaultGemmaBadge } from '../components/VaultGemmaBadge';

function EvaluationResult({ evaluation }) {
  return (
    <div>
      <h3>{evaluation.name}</h3>
      
      {evaluation.dp_protected && (
        <VaultGemmaBadge privacyScore={evaluation.privacy_score} />
      )}
      
      <div>Accuracy: {evaluation.accuracy}%</div>
    </div>
  );
}
```

### Pattern 3: Grid of Evaluation Cards

```tsx
import { EvaluationCard } from '../components/EvaluationCard';

function EvaluationsGrid({ evaluations }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {evaluations.map(eval => (
        <EvaluationCard
          key={eval.id}
          name={eval.name}
          model={eval.model}
          testSet={eval.testSet}
          status={eval.status}
          metrics={eval.metrics}
          createdAt={eval.createdAt}
          dpProtected={eval.dpProtected}
          onClick={() => viewDetails(eval.id)}
        />
      ))}
    </div>
  );
}
```

### Pattern 4: Privacy Audit Page

```tsx
import { PrivacyAuditView } from '../components/PrivacyAuditView';

function AuditPage() {
  return (
    <div className="p-8">
      <h1>Privacy & Security Audit</h1>
      <PrivacyAuditView />
    </div>
  );
}
```

---

## 🔒 Security Best Practices

### ✅ DO:
- Wrap privacy-sensitive pages with `PrivacyProvider`
- Check `userVaultPermissions.canDecrypt` before revealing PII
- Log all PII access attempts for audit trails
- Set `vault_processed: true` on traces that went through encryption
- Use `privacy_score` from VaultGemma evaluations

### ❌ DON'T:
- Don't log decrypted PII values
- Don't store plaintext PII in localStorage/sessionStorage
- Don't disable privacy mode by default
- Don't skip permission checks in production
- Don't use these components without SSL/TLS

---

## 🎯 Data Structure Requirements

### Trace Object (minimum requirements)

```typescript
const trace = {
  trace_id: string,
  name: string,
  status: 'success' | 'error' | 'running',
  start_time: string, // ISO 8601
  privacy_score?: number, // 0-100, shows DP badge if present
  vault_processed?: boolean, // Shows Vault indicator
  spans?: [
    {
      span_id: string,
      name: string,
      span_type: 'llm' | 'tool' | 'chain',
      input: any,
      output: any,
      has_pii?: boolean, // Masks input/output if true
      latency_ms?: number,
    }
  ]
};
```

### Evaluation Object (for EvaluationCard)

```typescript
const evaluation = {
  name: string,
  model: string,
  testSet: string,
  status: 'completed' | 'running' | 'failed',
  createdAt: string, // ISO 8601
  dpProtected: boolean, // Shows VaultGemma badge
  metrics?: {
    accuracy: number, // 0-1
    f1_score: number,
    latency_p95: number, // milliseconds
    total_evaluations: number,
    privacy_score: number, // 0-100
    dp_protected: boolean,
  }
};
```

---

## 🐛 Troubleshooting

### Issue: "usePrivacy must be used within a PrivacyProvider"
**Solution:** Wrap your component tree with `<PrivacyProvider>`

### Issue: Decryption animation not showing
**Solution:** Check that CSS animations are enabled and `index.css` is imported

### Issue: Security Dashboard not appearing
**Solution:** Verify `isOpen={true}` and check z-index isn't being overridden

### Issue: MaskedField not masking data
**Solution:** Ensure `isPrivacyModeEnabled` is `true` in PrivacyContext

### Issue: VaultGemma badge tooltip not showing
**Solution:** Set `showTooltip={true}` and ensure parent has `overflow: visible`

---

## 📊 Performance Tips

1. **Lazy load SecurityDashboard:** Only render when `isOpen={true}`
2. **Limit audit events:** Current implementation caps at 50 events
3. **Debounce privacy toggle:** Add 200ms debounce to prevent rapid toggling
4. **Virtualize large trace lists:** Use react-window for 100+ traces
5. **Cache decrypted values:** Store in PrivacyContext to avoid re-decrypting

---

## 🎨 Customization Examples

### Change DP Badge Color Scheme

```tsx
// In VaultGemmaBadge.tsx, update the gradient
style={{
  background: 'linear-gradient(135deg, #10B981 0%, #34D399 50%, #6EE7B7 100%)', // Green theme
  // or
  background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 50%, #93C5FD 100%)', // Blue theme
}}
```

### Add Custom PII Types

```tsx
// In MaskedField.tsx, extend getPIIIcon()
const getPIIIcon = () => {
  switch (piiType) {
    case 'api_key':
      return '🔑';
    case 'ip_address':
      return '🌐';
    case 'license_plate':
      return '🚗';
    // ... existing cases
  }
};
```

### Custom Decryption Animation Duration

```tsx
// In MaskedField.tsx, change duration
const duration = 800; // Faster (was 1500ms)
```

---

## 📦 Zero Additional Dependencies

All components use packages already in your project:
- ✅ React 18
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ Lucide React (icons)
- ✅ No Framer Motion needed (pure CSS animations)

---

## 🚢 Ready to Deploy?

Checklist before production:
- [ ] PrivacyProvider wraps all authenticated routes
- [ ] Vault API endpoints configured
- [ ] PII detection integrated (Presidio/custom)
- [ ] VaultGemma evaluation endpoint connected
- [ ] Audit logging implemented
- [ ] Permission checks enforced
- [ ] SSL/TLS enabled
- [ ] Session timeout configured
- [ ] Rate limiting on decrypt operations
- [ ] Error boundaries added

---

**Need help?** Check `PRIVACY_COMPONENTS_README.md` for full documentation.
