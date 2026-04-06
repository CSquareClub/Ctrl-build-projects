export default function GeneralSettings() {

  return (

    <section className="space-y-6">

      <h2 className="text-xs uppercase tracking-widest text-primary">
        General
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div>

          <label className="block text-xs uppercase text-outline">
            Project Name
          </label>

          <input
            className="w-full bg-surface-container-lowest border border-outline rounded-lg px-4 py-3"
            type="text"
            defaultValue="OpenIssue Production"
          />

        </div>

        <div>

          <label className="block text-xs uppercase text-outline">
            Default Repository
          </label>

          <input
            className="w-full bg-surface-container-lowest border border-outline rounded-lg px-4 py-3"
            type="text"
            defaultValue="org-name/main-repo"
          />

        </div>

      </div>

    </section>

  );

}