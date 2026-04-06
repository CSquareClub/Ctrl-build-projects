import { Building2, MapPin, Link2, Users, UserCheck } from 'lucide-react';

export default function UserProfile({ user }) {
  const defaultUser = {
    login: 'username',
    avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    followers: 0,
    following: 0,
    bio: '',
    company: '',
    location: '',
    blog: '',
  };

  const p = user || defaultUser;

  return (
    <div className="border border-terminal-border rounded bg-terminal-surface p-4 mb-4 terminal-hover">
      {/* top bar */}
      <div className="flex items-center gap-2 mb-3 text-terminal-muted text-xs border-b border-terminal-border pb-2">
        <span className="text-terminal-bright">$</span>
        <span>gh user <span className="text-terminal-text">--profile</span> {p.login}</span>
      </div>

      <div className="flex gap-4 items-start">
        {/* avatar with green ring */}
        <div className="flex-shrink-0 relative">
          <div className="w-16 h-16 rounded border-2 border-terminal-text p-0.5" style={{ boxShadow: '0 0 12px rgba(34,197,94,0.3)' }}>
            <img src={p.avatar_url} alt={p.login} className="w-full h-full rounded object-cover" />
          </div>
        </div>

        {/* info */}
        <div className="flex-1 min-w-0">
          <div className="text-terminal-bright font-bold text-base glow">{p.login}</div>
          {p.bio && <div className="text-terminal-muted text-xs mt-0.5 italic">// {p.bio}</div>}

          <div className="flex gap-5 mt-2">
            <div className="flex items-center gap-1.5 text-xs">
              <Users size={11} className="text-terminal-muted" />
              <span className="text-terminal-bright font-bold">{(p.followers||0).toLocaleString()}</span>
              <span className="text-terminal-muted">followers</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <UserCheck size={11} className="text-terminal-muted" />
              <span className="text-terminal-bright font-bold">{(p.following||0).toLocaleString()}</span>
              <span className="text-terminal-muted">following</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-2">
            {p.company && (
              <span className="flex items-center gap-1 text-xs text-terminal-muted">
                <Building2 size={10} />{p.company}
              </span>
            )}
            {p.location && (
              <span className="flex items-center gap-1 text-xs text-terminal-muted">
                <MapPin size={10} />{p.location}
              </span>
            )}
            {p.blog && (
              <a href={p.blog} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-terminal-text hover:text-terminal-bright underline">
                <Link2 size={10} />{p.blog}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
