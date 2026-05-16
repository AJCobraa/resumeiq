import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const sections = [
  { id: 'interpretation-and-definitions', title: 'Interpretation and Definitions' },
  { id: 'collecting-and-using-data', title: 'Collecting and Using Your Personal Data' },
  { id: 'use-of-your-personal-data', title: 'Use of Your Personal Data' },
  { id: 'third-party-service-providers', title: 'Third-Party Service Providers' },
  { id: 'retention-of-your-personal-data', title: 'Retention of Your Personal Data' },
  { id: 'transfer-of-your-personal-data', title: 'Transfer of Your Personal Data' },
  { id: 'delete-your-personal-data', title: 'Delete Your Personal Data' },
  { id: 'disclosure-of-your-personal-data', title: 'Disclosure of Your Personal Data' },
  { id: 'security-of-your-personal-data', title: 'Security of Your Personal Data' },
  { id: 'chrome-extension-specific-disclosures', title: 'Chrome Extension Specific Disclosures' },
  { id: 'childrens-privacy', title: 'Children\'s Privacy' },
  { id: 'changes-to-this-privacy-policy', title: 'Changes to this Privacy Policy' },
  { id: 'contact-us', title: 'Contact Us' },
];

export default function PrivacyPolicy() {
  useEffect(() => {
    // Smooth scroll behavior for anchor links
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-card border-b border-border py-16 lg:py-24 animate-fade-up">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        
        <div className="container relative mx-auto px-6 max-w-6xl">
          <Link to="/">
            <Button variant="primary" className="mb-10 shadow-glow group px-5">
              <svg 
                className="w-4 h-4 transition-transform group-hover:-translate-x-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-bold">Back to Home</span>
            </Button>
          </Link>
          
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground text-lg">Last updated: May 16, 2026</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sticky Table of Contents - Hidden on Mobile */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-8 p-6 rounded-xl bg-card border border-border shadow-soft">
              <h3 className="font-semibold mb-6 text-xs uppercase tracking-widest text-muted-foreground">Contents</h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block py-2 text-sm text-muted-foreground hover:text-primary transition-colors border-l-2 border-transparent hover:border-primary pl-4"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 space-y-8 min-w-0">
            <div className="bg-card rounded-xl p-8 border border-border shadow-soft animate-scale-in">
              <p className="text-muted-foreground leading-relaxed">
                This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.
              </p>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                We use Your Personal Data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.
              </p>
            </div>

            <section id="interpretation-and-definitions" className="bg-card rounded-xl border border-border border-l-4 border-l-primary shadow-soft overflow-hidden transition-all hover:shadow-lg animate-scale-in">
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Interpretation and Definitions</h2>
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Interpretation</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      The words whose initial letters are capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Definitions</h3>
                    <p className="text-muted-foreground mb-4 font-medium">For the purposes of this Privacy Policy:</p>
                    <ul className="space-y-4 list-none text-muted-foreground">
                      <li>
                        <p><strong className="text-foreground">Account</strong> means a unique account created for You to access our Service or parts of our Service.</p>
                      </li>
                      <li>
                        <p><strong className="text-foreground">Company</strong> (referred to as either "the Company", "We", "Us" or "Our" in this Privacy Policy) refers to ResumeIQ.</p>
                      </li>
                      <li>
                        <p><strong className="text-foreground">Chrome Extension</strong> refers to the ResumeIQ browser extension available on the Chrome Web Store.</p>
                      </li>
                      <li>
                        <p><strong className="text-foreground">Cookies</strong> are small files placed on Your device by a website, containing details of Your browsing history on that website among its many uses.</p>
                      </li>
                      <li>
                        <p><strong className="text-foreground">Country</strong> refers to: Rajasthan, India</p>
                      </li>
                      <li>
                        <p><strong className="text-foreground">Device</strong> means any device that can access the Service such as a computer, a cell phone or a digital tablet.</p>
                      </li>
                      <li>
                        <p><strong className="text-foreground">Personal Data</strong> is any information that relates to an identified or identifiable individual.</p>
                      </li>
                      <li>
                        <p><strong className="text-foreground">Service</strong> refers to the Website and the Chrome Extension collectively.</p>
                      </li>
                      <li>
                        <p><strong className="text-foreground">Service Provider</strong> means any natural or legal person who processes the data on behalf of the Company.</p>
                      </li>
                      <li>
                        <p><strong className="text-foreground">Usage Data</strong> refers to data collected automatically, either generated by the use of the Service or from the Service infrastructure itself.</p>
                      </li>
                      <li>
                        <p><strong className="text-foreground">Website</strong> refers to ResumeIQ, accessible from <a href="https://resumeiq-frontend-stagging.up.railway.app/" target="_blank" rel="noreferrer" className="text-primary hover:underline decoration-2 underline-offset-4">https://resumeiq-frontend-stagging.up.railway.app/</a></p>
                      </li>
                      <li>
                        <p><strong className="text-foreground">You</strong> means the individual accessing or using the Service.</p>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section id="collecting-and-using-data" className="bg-card rounded-xl border border-border border-l-4 border-l-primary shadow-soft overflow-hidden transition-all hover:shadow-lg animate-scale-in">
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Collecting and Using Your Personal Data</h2>
                
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Types of Data Collected</h3>
                    <h4 className="text-lg font-medium mb-3 text-foreground/80">Personal Data</h4>
                    <p className="text-muted-foreground mb-4">While using Our Service, We may ask You to provide Us with certain personally identifiable information, including but not limited to:</p>
                    <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                      <li>Email address</li>
                      <li>First name and last name</li>
                      <li>Resume content (uploaded by You for AI analysis)</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-3 text-foreground/80">Chrome Extension Data</h4>
                    <p className="text-muted-foreground mb-4">When You use the ResumeIQ Chrome Extension, We collect the following additional data:</p>
                    <ul className="list-none space-y-4 text-muted-foreground">
                      <li className="flex gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        <p><strong>Job description text</strong> — extracted from job listing pages You actively visit (LinkedIn, Naukri, Indeed, Glassdoor, Internshala, etc.) solely for the purpose of matching against Your resume. This data is not stored permanently.</p>
                      </li>
                      <li className="flex gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        <p><strong>Authentication token</strong> — stored locally in Your browser using Chrome's storage API to maintain Your login session. This token is never shared with third parties.</p>
                      </li>
                      <li className="flex gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        <p><strong>Resume match history</strong> — job titles and match scores stored locally and on our servers to show You your past analysis results.</p>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-3 text-foreground/80">Usage Data</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      Usage Data is collected automatically when using the Service and may include pages visited (like Linkdin, Naukri, Indeed, Glassdoor, Internshala, etc.), time and date of visit, and other diagnostic data.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-3 text-foreground/80">Tracking Technologies and Cookies</h4>
                    <p className="text-muted-foreground mb-4">We use essential Cookies to authenticate users and maintain login sessions. We do not use advertising or remarketing cookies. Cookie types we use:</p>
                    <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                      <li><strong>Necessary / Essential Cookies</strong> — Session Cookies required for authentication and to prevent fraudulent use of accounts.</li>
                      <li><strong>Functionality Cookies</strong> — Persistent Cookies to remember Your login details and preferences across sessions.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section id="use-of-your-personal-data" className="bg-card rounded-xl border border-border border-l-4 border-l-primary shadow-soft overflow-hidden transition-all hover:shadow-lg animate-scale-in">
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Use of Your Personal Data</h2>
                <p className="text-muted-foreground mb-6">The Company uses Personal Data for the following purposes:</p>
                <ul className="list-none space-y-4 text-muted-foreground">
                  {[
                    { label: 'To provide and maintain our Service', desc: 'including resume analysis, keyword matching, and job match scoring.' },
                    { label: 'To manage Your Account', desc: 'and provide access to registered user features.' },
                    { label: 'To process AI analysis', desc: 'Your resume and job description text is sent to third-party AI providers (Groq, Google AI) solely to generate analysis results.' },
                    { label: 'To contact You', desc: 'via email for account verification, security updates, and service notifications.' },
                    { label: 'To manage Your requests', desc: 'and provide customer support.' },
                    { label: 'For service improvement', desc: 'anonymized usage data may be used to improve our AI matching accuracy and user experience.' },
                  ].map((item, i) => (
                    <li key={i} className="flex gap-4">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </div>
                      <p><strong className="text-foreground">{item.label}</strong> — {item.desc}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section id="third-party-service-providers" className="bg-card rounded-xl border border-border border-l-4 border-l-primary shadow-soft overflow-hidden transition-all hover:shadow-lg animate-scale-in">
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Third-Party Service Providers</h2>
                <p className="text-muted-foreground mb-6">We share Your data only with the following trusted service providers who are bound to protect Your data:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'Railway', role: 'Cloud hosting', link: 'https://railway.app/legal/privacy' },
                    { name: 'Firebase / Google', role: 'Auth & Database', link: 'https://firebase.google.com/support/privacy' },
                    { name: 'Groq', role: 'AI processing', link: 'https://groq.com/privacy-policy/' },
                    { name: 'Google AI (Gemini)', role: 'AI analysis', link: 'https://policies.google.com/privacy' },
                  ].map((provider) => (
                    <div key={provider.name} className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                      <h4 className="font-bold mb-1">{provider.name}</h4>
                      <p className="text-xs text-muted-foreground mb-2">{provider.role}</p>
                      <a href={provider.link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View Privacy Policy</a>
                    </div>
                  ))}
                </div>
                <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-primary font-medium">
                    We do <strong>not</strong> sell, rent, or share Your Personal Data with any third party for marketing or advertising purposes.
                  </p>
                </div>
              </div>
            </section>

            <section id="retention-of-your-personal-data" className="bg-card rounded-xl border border-border border-l-4 border-l-primary shadow-soft overflow-hidden transition-all hover:shadow-lg animate-scale-in">
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Retention of Your Personal Data</h2>
                <p className="text-muted-foreground mb-6">We retain Your Personal Data only for as long as necessary. Retention periods:</p>
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-secondary/50 text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Data Type</th>
                        <th className="px-6 py-3 font-semibold">Retention Period</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="px-6 py-4 font-medium">Account data</td>
                        <td className="px-6 py-4 text-muted-foreground">Duration of Account</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-medium">Resume content</td>
                        <td className="px-6 py-4 text-muted-foreground">Active account duration (instant delete on request)</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-medium">Job description text</td>
                        <td className="px-6 py-4 text-muted-foreground">Real-time processing (not stored)</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-medium">Authentication tokens</td>
                        <td className="px-6 py-4 text-muted-foreground">Cleared upon logout</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section id="transfer-of-your-personal-data" className="bg-card rounded-xl border border-border border-l-4 border-l-primary shadow-soft overflow-hidden transition-all hover:shadow-lg animate-scale-in">
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Transfer of Your Personal Data</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Your information may be transferred to and maintained on computers located outside of Your state, province, country or other governmental jurisdiction. The Company will take all steps reasonably necessary to ensure Your data is treated securely in accordance with this Privacy Policy.
                </p>
              </div>
            </section>

            <section id="delete-your-personal-data" className="bg-card rounded-xl border border-border border-l-4 border-l-primary shadow-soft overflow-hidden transition-all hover:shadow-lg animate-scale-in">
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Delete Your Personal Data</h2>
                <p className="text-muted-foreground mb-4">You have the right to delete or request deletion of Your Personal Data at any time. You may:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  {/* <div className="p-6 rounded-xl bg-secondary/30 border border-border/60">
                    <h4 className="font-bold mb-2">Self-Service</h4>
                    <p className="text-sm text-muted-foreground mb-4">Delete Your account directly from the account settings page.</p>
                    <Link to="/settings" className="text-sm text-primary font-semibold hover:underline">Go to Settings →</Link>
                  </div> */}
                  <div className="p-6 rounded-xl bg-secondary/30 border border-border/60">
                    <h4 className="font-bold mb-2">Direct Request</h4>
                    <p className="text-sm text-muted-foreground mb-4">Contact our support team for full data erasure across all systems.</p>
                    <a href="mailto:joseanupam1999@gmail.com" className="text-sm text-primary font-semibold hover:underline">Email Support →</a>
                  </div>
                </div>
                <p className="mt-6 text-muted-foreground text-sm italic">
                  We will process deletion requests within 30 days. Note that We may retain certain data where required by law.
                </p>
              </div>
            </section>

            <section id="disclosure-of-your-personal-data" className="bg-card rounded-xl border border-border border-l-4 border-l-primary shadow-soft overflow-hidden transition-all hover:shadow-lg animate-scale-in">
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Disclosure of Your Personal Data</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Law Enforcement</h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">
                      The Company may disclose Your Personal Data if required by law or in response to valid requests by public authorities.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Other Legal Requirements</h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">
                      The Company may disclose Your Personal Data in good faith to comply with legal obligations, protect rights or property, prevent wrongdoing, or protect against legal liability.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section id="security-of-your-personal-data" className="bg-card rounded-xl border border-border border-l-4 border-l-primary shadow-soft overflow-hidden transition-all hover:shadow-lg animate-scale-in">
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Security of Your Personal Data</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The security of Your Personal Data is important to Us. We use commercially reasonable means to protect Your data. However, no method of transmission over the Internet is 100% secure and We cannot guarantee absolute security.
                </p>
              </div>
            </section>

            <section id="chrome-extension-specific-disclosures" className="bg-card rounded-xl border border-border border-l-4 border-l-primary shadow-soft overflow-hidden transition-all hover:shadow-lg animate-scale-in">
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Chrome Extension Specific Disclosures</h2>
                <p className="text-muted-foreground mb-6">The ResumeIQ Chrome Extension:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    'Only activates on supported job board pages',
                    'Does not track Your general browsing history',
                    'Does not collect keystrokes or recordings',
                    'Does not execute remotely hosted code',
                    'Stores data locally using Chrome Storage API'
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section id="childrens-privacy" className="bg-card rounded-xl border border-border border-l-4 border-l-primary shadow-soft overflow-hidden transition-all hover:shadow-lg animate-scale-in">
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Children's Privacy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our Service does not address anyone under the age of 16. We do not knowingly collect personally identifiable information from anyone under the age of 16. If You are aware that Your child has provided Us with Personal Data, please contact Us and We will take steps to remove that information.
                </p>
              </div>
            </section>

            <section id="changes-to-this-privacy-policy" className="bg-card rounded-xl border border-border border-l-4 border-l-primary shadow-soft overflow-hidden transition-all hover:shadow-lg animate-scale-in">
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Changes to this Privacy Policy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. For significant changes, We will notify You via email.
                </p>
              </div>
            </section>

            <section id="contact-us" className="bg-card rounded-xl border border-border border-l-4 border-l-primary shadow-soft overflow-hidden transition-all hover:shadow-lg animate-scale-in">
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
                <p className="text-muted-foreground mb-6">If you have any questions about this Privacy Policy, You can contact us:</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a 
                    href="mailto:joseanupam1999@gmail.com" 
                    className="flex-1 p-4 rounded-xl bg-primary text-primary-foreground text-center font-bold shadow-glow hover:opacity-90 transition-opacity"
                  >
                    Email Us
                  </a>
                  <a 
                    href="https://resumeiq-frontend-stagging.up.railway.app/" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 p-4 rounded-xl bg-card border border-border text-center font-bold hover:bg-surface-hover transition-colors"
                  >
                    Web Support
                  </a>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* Footer Note */}
      <footer className="border-t border-border py-16 bg-card">
        <div className="container mx-auto px-6 max-w-6xl text-center">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-brand-dark flex items-center justify-center mx-auto mb-6 shadow-sm">
            <span className="text-primary-foreground font-bold text-xl">R</span>
          </div>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            This privacy policy was last reviewed on May 16, 2026.<br />
            For questions contact <a href="mailto:joseanupam1999@gmail.com" className="text-primary hover:underline font-medium">joseanupam1999@gmail.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
