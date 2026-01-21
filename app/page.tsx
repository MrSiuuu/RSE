"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Users, Award, Target, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              La RSE, c'est aussi pour moi
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-indigo-100">
              Module de formation RSE adapté aux PME ivoiriennes. 
              Découvrez la RSE simplement et identifiez votre première action concrète.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/access" className="w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto bg-white text-indigo-600 px-8 py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors"
                >
                  Commencer le module
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white/10 transition-colors"
              >
                En savoir plus
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Pourquoi choisir ce module ?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Une formation adaptée aux réalités des PME africaines, simple et actionnable.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Target,
                title: "Adapté aux PME",
                description: "Contenu pensé spécifiquement pour les dirigeants et managers de PME ivoiriennes.",
              },
              {
                icon: CheckCircle,
                title: "Simple et pratique",
                description: "Pas de jargon compliqué. Des actions concrètes que vous pouvez mettre en place rapidement.",
              },
              {
                icon: Award,
                title: "Gratuit et accessible",
                description: "Accès via code partagé. Aucun compte nécessaire. Formation en 20-30 minutes.",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <feature.icon className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What you'll learn */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Ce que vous allez découvrir
              </h2>
              <ul className="space-y-4">
                {[
                  "Les fondamentaux de la RSE adaptés aux PME",
                  "Votre niveau actuel de maturité RSE",
                  "5 gestes RSE simples à mettre en place",
                  "Comment définir votre première action concrète",
                  "Des témoignages inspirants d'entreprises ivoiriennes",
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-lg text-gray-700">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 shadow-lg"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Quiz de positionnement</h3>
                    <p className="text-gray-600">Évaluez où en est votre entreprise</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Notions clés</h3>
                    <p className="text-gray-600">RSE, ESG, ODD expliqués simplement</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-pink-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Actions concrètes</h3>
                    <p className="text-gray-600">5 gestes RSE à mettre en place</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    4
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Votre première action</h3>
                    <p className="text-gray-600">Définissez votre plan d'action</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Ce que disent les dirigeants
            </h2>
            <p className="text-xl text-gray-600">
              Des témoignages d'entreprises qui ont suivi le module
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Marie Kouassi",
                role: "Directrice, Atelier de couture - Cocody",
                content: "Ce module m'a ouvert les yeux sur la RSE. J'ai réalisé que je faisais déjà beaucoup de choses sans le savoir. Maintenant, je les valorise mieux.",
                rating: 5,
              },
              {
                name: "Amadou Traoré",
                role: "Gérant, Épicerie de quartier - Abobo",
                content: "Simple, pratique et adapté à ma réalité. J'ai identifié 3 actions que je peux mettre en place dès cette semaine. Merci !",
                rating: 5,
              },
              {
                name: "Fatou Diallo",
                role: "Présidente, Coopérative agroalimentaire - Yamoussoukro",
                content: "Enfin une formation RSE qui parle notre langue ! Pas de théorie compliquée, juste des actions concrètes pour mon entreprise.",
                rating: 5,
              },
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="bg-white p-8 rounded-2xl shadow-lg"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <span key={j} className="text-yellow-400 text-xl">★</span>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.content}"</p>
                <div>
                  <p className="font-bold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: "500+", label: "Participants" },
              { number: "95%", label: "Satisfaction" },
              { number: "20-30", label: "Minutes" },
              { number: "100%", label: "Gratuit" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="text-4xl md:text-5xl font-bold mb-2">{stat.number}</div>
                <div className="text-indigo-200">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Prêt à démarrer votre démarche RSE ?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Rejoignez les centaines de dirigeants qui ont déjà suivi ce module.
              C'est gratuit, rapide et sans engagement.
            </p>
            <Link href="/access">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-indigo-600 text-white px-8 py-4 rounded-lg font-bold text-lg flex items-center gap-2 mx-auto hover:bg-indigo-700 transition-colors"
              >
                Commencer maintenant
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">RSE App</h3>
              <p className="text-gray-400">
                Formation RSE adaptée aux PME ivoiriennes. 
                Simple, pratique et actionnable.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Liens rapides</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/access" className="hover:text-white transition-colors">
                    Accéder au module
                  </Link>
                </li>
                <li>
                  <Link href="/admin/login" className="hover:text-white transition-colors">
                    Espace admin
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Contact</h3>
              <p className="text-gray-400">
                Pour toute question, contactez-nous via WhatsApp
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2025 RSE App. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
