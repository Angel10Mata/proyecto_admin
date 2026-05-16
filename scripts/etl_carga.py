import sys
import time
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', help='Ruta al archivo CSV')
    parser.add_argument('--audit-id', help='ID de auditoria')
    args = parser.parse_args()

    print(f"--- Simulando ETL para archivo: {args.file} ---")
    time.sleep(2)  # Simular procesamiento
    print("REGISTROS_INSERTADOS:100")
    print("ETL Finalizado exitosamente")
    sys.exit(0)

if __name__ == "__main__":
    main()
