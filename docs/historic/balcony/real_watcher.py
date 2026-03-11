import time
from watchdog.observers import Observer
from watchdog.events import PatternMatchingEventHandler

import os

target_folder = 'C:\\DADOS\\3.CURRENT_REPOSITORY\\1.PROJETOS'

def on_created(event):
    print(f"hey, {event.src_path} has been created!")
    save_description()

def on_deleted(event):
    print(f"what the f**k! Someone deleted {event.src_path}!")
    save_description()

def on_modified(event):
    print(f"hey buddy, {event.src_path} has been modified")
    save_description()

def on_moved(event):
    print(f"ok ok ok, someone moved {event.src_path} to {event.dest_path}")
    save_description()

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
    #print(data)
    with open('config.p', 'w') as f:
        f.writelines('directory,project,path\n')
        for dt in data:
            for d in dt:
                f.writelines(f'"{d["directory"]}","{d["project"]}", "{target_folder}\\{d["directory"]}\\{d["project"]}"\n')

def main():
    patterns = "*"
    ignore_patterns = ""
    ignore_directories = False
    case_sensitive = True
    my_event_handler = PatternMatchingEventHandler(patterns, ignore_patterns, ignore_directories, case_sensitive)

    my_event_handler.on_created = on_created
    my_event_handler.on_deleted = on_deleted
    my_event_handler.on_modified = on_modified
    my_event_handler.on_moved = on_moved

    path = "."
    path = 'C:\\DADOS\\3.CURRENT_REPOSITORY\\1.PROJETOS'
    go_recursively = False
    my_observer = Observer()
    my_observer.schedule(my_event_handler, path, recursive=go_recursively)

    my_observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        my_observer.stop()
        my_observer.join()

if __name__ == "__main__":
    print('watching...')
    main()


# https://www.google.com/search?q=python+watch+changes+in+directory&oq=python+watch+changes+in+directory&aqs=chrome..69i57.14983j0j7&sourceid=chrome&ie=UTF-8
# https://www.callback.com/cbfsfilter/?gclid=CjwKCAjwwab7BRBAEiwAapqpTBHQvzUT8Wb89BbzyAg8SFoMPLV7wPZ5PJguuKfnerUzRC9pjunM0RoCcewQAvD_BwE
# http://timgolden.me.uk/python/win32_how_do_i/watch_directory_for_changes.html
# https://blog.magrathealabs.com/filesystem-events-monitoring-with-python-9f5329b651c3
# https://pypi.org/project/watchdog/
# http://thepythoncorner.com/dev/how-to-create-a-watchdog-in-python-to-look-for-filesystem-changes/
# https://pythonhosted.org/watchdog/
# https://pythonhosted.org/watchdog/quickstart.html#quickstart