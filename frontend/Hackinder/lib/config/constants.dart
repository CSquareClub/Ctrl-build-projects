class AppConstants {
  // Spring Boot API
  static const String baseUrl = 'http://localhost:8080/api';

  // Supabase
  static const String supabaseUrl = 'https://yrcejvckguemomakvwmf.supabase.co';
  static const String supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyY2VqdmNrZ3VlbW9tYWt2d21mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NTgxODMsImV4cCI6MjA5MTAzNDE4M30.5DEUfHtm9npJaG9WYBNgHQ5HfLWvx2RerVD0wGW2Oyk';

  // Roles
  static const List<String> roles = ['Hacker', 'Hipster', 'Hustler'];

  // Role descriptions
  static const Map<String, String> roleDescriptions = {
    'Hacker': 'Builder — writes the code',
    'Hipster': 'Designer — makes it beautiful',
    'Hustler': 'Business — sells the vision',
  };
}