# scan_imports.py
import os
import ast
import pkg_resources
from collections import defaultdict

def scan_imports_in_file(file_path):
    """Scan un fichier Python pour trouver tous les imports"""
    imports = set()
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            tree = ast.parse(file.read(), filename=file_path)
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.add(alias.name.split('.')[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.add(node.module.split('.')[0])
    except:
        pass
    return imports

def scan_project_imports(project_path):
    """Scan tout le projet pour les imports"""
    all_imports = set()
    
    for root, dirs, files in os.walk(project_path):
        # Ignorer les dossiers inutiles
        if 'venv' in root or '__pycache__' in root or '.git' in root:
            continue
            
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                imports = scan_imports_in_file(file_path)
                all_imports.update(imports)
    
    return all_imports

def map_imports_to_packages(imports):
    """Associe les noms d'import aux noms de packages pip"""
    installed_packages = {pkg.key: pkg.project_name for pkg in pkg_resources.working_set}
    
    used_packages = set()
    for import_name in imports:
        # Chercher le package correspondant
        if import_name in installed_packages:
            used_packages.add(installed_packages[import_name])
        else:
            # Chercher les packages qui pourraient correspondre
            for pkg_key, pkg_name in installed_packages.items():
                if import_name.lower() in pkg_key.lower() or pkg_key.lower() in import_name.lower():
                    used_packages.add(pkg_name)
    
    return used_packages

if __name__ == "__main__":
    project_path = r"C:\Users\DELL\Desktop\Gestages\gsbackend"
    
    print("🔍 Scan des imports dans le projet...")
    imports = scan_project_imports(project_path)
    
    print("📦 Mapping des imports vers les packages...")
    used_packages = map_imports_to_packages(imports)
    
    print("\n✅ PACKAGES UTILISÉS DANS VOTRE PROJET:")
    for pkg in sorted(used_packages):
        print(f"  - {pkg}")
    
    # Packages installés mais non utilisés
    all_packages = {pkg.project_name for pkg in pkg_resources.working_set}
    unused_packages = all_packages - used_packages
    
    print(f"\n❌ PACKAGES PROBABLEMENT INUTILES ({len(unused_packages)}):")
    for pkg in sorted(unused_packages):
        print(f"  - {pkg}")
    
    print(f"\n📊 Résumé: {len(used_packages)} packages utilisés, {len(unused_packages)} packages inutilisés")