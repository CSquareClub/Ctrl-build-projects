import React, { useState } from 'react';
import { Copy, Download, Share2, Star, TrendingUp, ChevronDown } from 'lucide-react';

export default function DemoOutput() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 py-12 px-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">README.AI Demo</h1>
            <p className="text-slate-400">AI-Generated README for Django Framework</p>
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Copy size={18} /> Copy
            </button>
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} /> Export
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Share2 size={18} /> Share
            </button>
          </div>
        </div>

        {/* Quality Metrics Bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="card-base p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Quality Score</span>
              <TrendingUp size={18} className="text-green-400" />
            </div>
            <div className="text-3xl font-bold gradient-text">94/100</div>
            <div className="text-xs text-slate-500 mt-1">Excellent</div>
          </div>
          <div className="card-base p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Readability</span>
              <Star size={18} className="text-blue-400" />
            </div>
            <div className="text-3xl font-bold gradient-text">8.7/10</div>
            <div className="text-xs text-slate-500 mt-1">Advanced</div>
          </div>
          <div className="card-base p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Completeness</span>
              <TrendingUp size={18} className="text-purple-400" />
            </div>
            <div className="text-3xl font-bold gradient-text">98%</div>
            <div className="text-xs text-slate-500 mt-1">All sections</div>
          </div>
          <div className="card-base p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Generated in</span>
              <ChevronDown size={18} className="text-pink-400" />
            </div>
            <div className="text-3xl font-bold gradient-text">4.2s</div>
            <div className="text-xs text-slate-500 mt-1">AI Powered</div>
          </div>
        </div>
      </div>

      {/* README Content */}
      <div className="max-w-6xl mx-auto">
        <div className="card-base p-12 shadow-2xl border border-sky/20">
          {/* Title Section */}
          <div className="mb-12 pb-8 border-b border-slate-700/40">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-5xl font-bold mb-3">🎯 Django</h2>
                <p className="text-xl text-slate-300 mb-2">
                  The Web Framework for Perfectionists with Deadlines
                </p>
                <p className="text-slate-400 max-w-3xl">
                  A high-level Python web framework that encourages rapid development and clean, pragmatic design. 
                  Built for developers who demand excellence and speed without compromise.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="px-4 py-2 bg-sky/20 text-sky rounded-full text-sm font-semibold">
                  Python
                </span>
                <span className="px-4 py-2 bg-purple/20 text-purple rounded-full text-sm font-semibold">
                  Framework
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mb-12 py-8 border-b border-slate-700/40">
            <div>
              <div className="text-slate-400 text-sm mb-1">GitHub Stars</div>
              <div className="text-2xl font-bold text-sky">87.2k</div>
            </div>
            <div>
              <div className="text-slate-400 text-sm mb-1">Contributors</div>
              <div className="text-2xl font-bold text-purple">2,763+</div>
            </div>
            <div>
              <div className="text-slate-400 text-sm mb-1">Python Support</div>
              <div className="text-2xl font-bold text-pink">3.10+</div>
            </div>
            <div>
              <div className="text-slate-400 text-sm mb-1">License</div>
              <div className="text-2xl font-bold text-green-400">BSD-3</div>
            </div>
          </div>

          {/* TOC */}
          <div className="mb-12 pb-8 border-b border-slate-700/40">
            <h3 className="text-xl font-bold mb-4 text-sky">📑 Table of Contents</h3>
            <ul className="grid grid-cols-2 gap-3 text-slate-300">
              <li className="flex items-center gap-2">
                <span className="text-sky">•</span> <a href="#features" className="hover:text-sky transition">Core Features</a>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple">•</span> <a href="#install" className="hover:text-purple transition">Installation</a>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-pink">•</span> <a href="#quickstart" className="hover:text-pink transition">Quick Start</a>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">•</span> <a href="#docs" className="hover:text-green-400 transition">Documentation</a>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-sky">•</span> <a href="#contrib" className="hover:text-sky transition">Contributing</a>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple">•</span> <a href="#license" className="hover:text-purple transition">License</a>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div className="mb-12 pb-8 border-b border-slate-700/40">
            <h3 className="text-2xl font-bold mb-6 text-sky" id="features">✨ Core Features</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-sky/10 to-blue/10 p-6 rounded-xl border border-sky/20">
                <div className="text-lg font-semibold text-sky mb-2">🏗️ Batteries Included</div>
                <p className="text-slate-300">Complete toolkit with ORM, authentication, admin panel, forms, and more out of the box.</p>
              </div>
              <div className="bg-gradient-to-br from-purple/10 to-pink/10 p-6 rounded-xl border border-purple/20">
                <div className="text-lg font-semibold text-purple mb-2">🔒 Security First</div>
                <p className="text-slate-300">Built-in protection against CSRF, SQL injection, XSS, and other common web vulnerabilities.</p>
              </div>
              <div className="bg-gradient-to-br from-green-400/10 to-cyan/10 p-6 rounded-xl border border-green-400/20">
                <div className="text-lg font-semibold text-green-400 mb-2">⚡ Performance</div>
                <p className="text-slate-300">Highly optimized with query optimization, caching, and middleware for production-grade apps.</p>
              </div>
              <div className="bg-gradient-to-br from-pink/10 to-rose/10 p-6 rounded-xl border border-pink/20">
                <div className="text-lg font-semibold text-pink mb-2">📚 Extensive Docs</div>
                <p className="text-slate-300">Comprehensive documentation with tutorials, guides, and API references for all skill levels.</p>
              </div>
              <div className="bg-gradient-to-br from-sky/10 to-cyan/10 p-6 rounded-xl border border-sky/20">
                <div className="text-lg font-semibold text-sky mb-2">🧪 Built-in Testing</div>
                <p className="text-slate-300">Full testing framework with fixtures, mocking, and test clients included.</p>
              </div>
              <div className="bg-gradient-to-br from-purple/10 to-indigo/10 p-6 rounded-xl border border-purple/20">
                <div className="text-lg font-semibold text-purple mb-2">🌐 Scalable</div>
                <p className="text-slate-300">Designed to scale from simple projects to complex enterprise applications serving millions.</p>
              </div>
            </div>
          </div>

          {/* Installation */}
          <div className="mb-12 pb-8 border-b border-slate-700/40">
            <h3 className="text-2xl font-bold mb-4 text-purple" id="install">📦 Installation</h3>
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 mb-4">
              <div className="text-slate-300 text-sm mb-3 font-semibold">Pip (Recommended)</div>
              <code className="text-sky">pip install django</code>
            </div>
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
              <div className="text-slate-300 text-sm mb-3 font-semibold">From Source</div>
              <code className="text-sky block mb-2">git clone https://github.com/django/django.git</code>
              <code className="text-sky block mb-2">cd django</code>
              <code className="text-sky">pip install -e .</code>
            </div>
          </div>

          {/* Quick Start */}
          <div className="mb-12 pb-8 border-b border-slate-700/40">
            <h3 className="text-2xl font-bold mb-4 text-pink" id="quickstart">🚀 Quick Start</h3>
            <div className="space-y-4">
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
                <div className="text-slate-300 text-sm mb-3 font-semibold">1. Create a new project</div>
                <code className="text-green-400">django-admin startproject myproject</code>
              </div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
                <div className="text-slate-300 text-sm mb-3 font-semibold">2. Create an app</div>
                <code className="text-green-400">python manage.py startapp myapp</code>
              </div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
                <div className="text-slate-300 text-sm mb-3 font-semibold">3. Run development server</div>
                <code className="text-green-400">python manage.py runserver</code>
              </div>
              <p className="text-slate-400">Full tutorial available at <a href="#" className="text-sky hover:underline">Django Documentation</a></p>
            </div>
          </div>

          {/* API Overview */}
          <div className="mb-12 pb-8 border-b border-slate-700/40">
            <h3 className="text-2xl font-bold mb-6 text-sky">🔧 Key APIs</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="font-semibold text-slate-200 mb-2">Models (ORM)</div>
                <code className="text-xs bg-slate-900 p-4 rounded text-green-400 block overflow-x-auto">
                {`class Post(models.Model):
  title = models.CharField(max_length=200)
  content = models.TextField()
  created_at = models.DateTimeField(auto_now_add=True)`}
                </code>
              </div>
              <div>
                <div className="font-semibold text-slate-200 mb-2">Views</div>
                <code className="text-xs bg-slate-900 p-4 rounded text-green-400 block overflow-x-auto">
                {`def post_list(request):
  posts = Post.objects.all()
  return render(request, 'posts/list.html',
    {'posts': posts})`}
                </code>
              </div>
            </div>
          </div>

          {/* Architecture */}
          <div className="mb-12 pb-8 border-b border-slate-700/40">
            <h3 className="text-2xl font-bold mb-4 text-purple">🏛️ Architecture Overview</h3>
            <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 p-8 rounded-xl border border-slate-700 text-center">
              <div className="space-y-4 text-slate-300">
                <div className="flex justify-center items-center gap-4">
                  <div className="px-4 py-3 bg-sky/20 rounded-lg text-sky font-semibold">Views</div>
                  <div className="text-sky">↔</div>
                  <div className="px-4 py-3 bg-purple/20 rounded-lg text-purple font-semibold">Models (ORM)</div>
                  <div className="text-purple">↔</div>
                  <div className="px-4 py-3 bg-pink/20 rounded-lg text-pink font-semibold">Database</div>
                </div>
                <div className="text-sm text-slate-500">↑ URL Router ↓</div>
              </div>
            </div>
          </div>

          {/* Contributing */}
          <div className="mb-12 pb-8 border-b border-slate-700/40">
            <h3 className="text-2xl font-bold mb-4 text-green-400" id="contrib">🤝 Contributing</h3>
            <ol className="space-y-3 text-slate-300 list-decimal list-inside">
              <li>Fork the repository on GitHub</li>
              <li>Create a branch for your changes: <code className="text-sky">git checkout -b feature/my-feature</code></li>
              <li>Make your changes and write tests</li>
              <li>Run the test suite: <code className="text-sky">python runtests.py</code></li>
              <li>Submit a pull request</li>
            </ol>
            <p className="mt-4 text-slate-400">See <a href="#" className="text-sky hover:underline">CONTRIBUTING.rst</a> for detailed guidelines.</p>
          </div>

          {/* Resources */}
          <div className="mb-12 pb-8 border-b border-slate-700/40">
            <h3 className="text-2xl font-bold mb-4 text-sky">📚 Resources</h3>
            <div className="grid grid-cols-2 gap-4 text-slate-300">
              <a href="#" className="hover:bg-sky/10 p-3 rounded-lg transition">📖 Official Documentation</a>
              <a href="#" className="hover:bg-purple/10 p-3 rounded-lg transition">💬 Django Discord</a>
              <a href="#" className="hover:bg-pink/10 p-3 rounded-lg transition">🐛 Issue Tracker</a>
              <a href="#" className="hover:bg-green-400/10 p-3 rounded-lg transition">🤝 Forum</a>
            </div>
          </div>

          {/* License */}
          <div className="pb-8">
            <h3 className="text-2xl font-bold mb-4 text-pink" id="license">⚖️ License</h3>
            <p className="text-slate-300 mb-3">Django is released under the BSD 3-Clause License. See the LICENSE file for more details.</p>
            <div className="bg-slate-900 p-4 rounded-lg text-xs text-slate-400">
              <p>Django is maintained by the Django Software Foundation and the Django community.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-12 text-center text-slate-500 text-sm">
        <p>Generated by README.AI • Quality Score: 94/100</p>
      </div>
    </div>
  );
}
