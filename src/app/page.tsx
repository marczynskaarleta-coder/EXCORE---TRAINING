import Link from 'next/link'
import { BookOpen, Users, Calendar, Zap, Shield, BarChart3 } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">EXCORE Training</h1>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Zaloguj
            </Link>
            <Link
              href="/register"
              className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Zaloz konto
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-6 py-24 text-center">
          <h2 className="text-5xl font-bold tracking-tight mb-4">
            Platforma edukacyjna<br />dla firm szkoleniowych
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Kursy, community, wydarzenia, mentoring, billing.
            Wszystko w jednym miejscu, pod Twoja marka.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3 text-lg bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Zacznij za darmo
            </Link>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: BookOpen,
                title: 'Produkty edukacyjne',
                desc: 'Kursy, programy kohortowe, membership, mentoring. Nie kolejny LMS - prawdziwa platforma biznesowa.',
              },
              {
                icon: Users,
                title: 'Spolecznosc',
                desc: 'Spaces, feed, posty, komentarze, DM. Twoi uczestnicy w jednym miejscu, nie rozrzuceni po grupach.',
              },
              {
                icon: Calendar,
                title: 'Wydarzenia',
                desc: 'Webinary, warsztaty, spotkania. RSVP, przypomnienia, replay. Rytm Twojego programu.',
              },
              {
                icon: Shield,
                title: 'White-label',
                desc: 'Twoja marka, Twoja domena, Twoje kolory. Platforma wyglada jak Twoja, bo jest Twoja.',
              },
              {
                icon: Zap,
                title: 'Automatyzacje',
                desc: 'Po zakupie dodaj do kursu. Po dolaczeniu wyslij onboarding. Przed eventem przypomnij.',
              },
              {
                icon: BarChart3,
                title: 'Analityka',
                desc: 'Kto konczy kursy, kto odpada, co dziala. Dane do podejmowania decyzji.',
              },
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-lg border bg-card">
                <feature.icon className="h-8 w-8 text-primary mb-3" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
          EXCORE Training 2026. Platforma edukacyjna dla firm szkoleniowych.
        </div>
      </footer>
    </div>
  )
}
