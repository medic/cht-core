import os
import socket, requests

from _thread import *
import threading

print_lock = threading.Lock()

couchdb_servers = os.environ['COUCHDB_SERVERS'].split(',')
# Example: COUCHDB_SERVERS="couchdb.1,couchdb.2,couchdb.3"
username = os.environ['COUCHDB_USER']
password = os.environ['COUCHDB_PASSWORD']

def get_membership_endpoint(couchdb_url):
    return f'http://{username}:{password}@{couchdb_url}:5984/_membership'

def close_connection(connection):
    print('Closing connection ...')
    connection.close()

def send_down_response(conn):
    print('Sending response: Down (CouchDB cluster not okay) ...')
    conn.send(b'down\n')
    close_connection(conn)

def send_up_response(conn):
    print('Sending response: Up (Couchdb cluster okay) ...')
    conn.send(b'up\n')
    close_connection(conn)

def threaded(conn):
    try:
        result = []
        couchdb_server = couchdb_servers[0]
        try:
            r = requests.get(get_membership_endpoint(couchdb_server), timeout=1)
        except Exception as e:
            print("Exception: ", e)
        data = r.json()

        all_nodes = sorted(data['all_nodes'])
        cluster_nodes = sorted(data['cluster_nodes'])

        if len(all_nodes) != len(couchdb_servers):
            print('Nodes starting up')
            print(f'Details: all_nodes: {all_nodes}. couchdb_servers: {couchdb_servers}')
            result.append(b'down\n')
        elif all_nodes != cluster_nodes:
            print('_membership shows not all nodes are part of Cluster')
            print(f'Details: all_nodes: {all_nodes}. cluster_nodes: {cluster_nodes}')
            result.append(b'down\n')
        else:
            print('Everything is fine')
            result.append(b'up\n')
        print(result)
    except Exception as e:
        result.append(b'down\n')
        print("Exception: ", e)
    finally:
        if b'down\n' in result:
            send_down_response(conn)
        else:
            send_up_response(conn)

    print_lock.release()
    print('Client disconnected')

def Main():
    serv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    serv.bind(('0.0.0.0', 5555))
    serv.listen(5)
    while True:
        conn, addr = serv.accept()
        print_lock.acquire()
        print(f'Connected to:{addr[0]}:{addr[1]}')

        start_new_thread(threaded, (conn,))

if __name__ == '__main__':
    Main()