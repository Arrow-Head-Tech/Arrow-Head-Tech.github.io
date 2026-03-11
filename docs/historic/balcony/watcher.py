import glob
import os
import pickle


class Watcher:
    pass

def describe():
    target_folder = 'C:\\DADOS\\3.CURRENT_REPOSITORY\\1.PROJETOS'
    root_dirs = os.listdir(target_folder)
    dirs_projects = []
    for dir_ in root_dirs:
        path = os.path.join(target_folder, dir_)
        if(os.path.isdir(path)):
            projects = os.listdir(os.path.join(path))
            dir_projects = [{'directory' : dir_, 'project' : project} for project in projects if os.path.isdir(os.path.join(path, project))]
            dirs_projects.append(dir_projects)
    return dirs_projects

def save_description():
    data = describe()
    print(data)
    with open('config.p', 'w') as f:
        f.writelines('directory,project\n')
        for dt in data:
            for d in dt:
                f.writelines(f'"{d["directory"]}","{d["project"]}"\n')

def main():
    save_description()


if(__name__ == '__main__'):
    main()