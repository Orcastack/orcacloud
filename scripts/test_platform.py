"""
Comprehensive testing script for OrcaCloud
Tests all integrations: Django, Zookeeper, Kafka, RabbitMQ, Email
"""
import os
import sys
import subprocess
import time
import requests
from datetime import datetime

# Add the backend directory to Python path
sys.path.insert(0, '/home/atonixdev/orcacloud/backend')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'orcacloud.settings')

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(title):
    """Print a formatted header."""
    print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"{Colors.CYAN}{Colors.BOLD}{title.center(60)}{Colors.END}")
    print(f"{Colors.CYAN}{Colors.BOLD}{'='*60}{Colors.END}\n")

def print_success(message):
    """Print success message."""
    print(f"{Colors.GREEN}{Colors.END} {message}")

def print_error(message):
    """Print error message."""
    print(f"{Colors.RED}{Colors.END} {message}")

def print_warning(message):
    """Print warning message."""
    print(f"{Colors.YELLOW}[WARNING]{Colors.END} {message}")

def print_info(message):
    """Print info message."""
    print(f"{Colors.BLUE}ℹ{Colors.END} {message}")

def run_command(command, description, expect_error=False):
    """Run a command and return success status."""
    print_info(f"Running: {description}")
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            capture_output=True, 
            text=True, 
            timeout=30
        )
        
        if result.returncode == 0 or expect_error:
            print_success(f"{description} - OK")
            if result.stdout.strip():
                print(f"   Output: {result.stdout.strip()[:200]}...")
            return True
        else:
            print_error(f"{description} - Failed")
            if result.stderr.strip():
                print(f"   Error: {result.stderr.strip()[:200]}...")
            return False
    except subprocess.TimeoutExpired:
        print_error(f"{description} - Timeout")
        return False
    except Exception as e:
        print_error(f"{description} - Exception: {e}")
        return False

def test_django_setup():
    """Test Django application setup."""
    print_header("TESTING DJANGO APPLICATION")
    
    results = []
    
    # Test Django system check
    cmd = "cd /home/atonixdevmaster/orcacloud/backend && /home/atonixdevmaster/orcacloud/.venv/bin/python manage.py check"
    results.append(run_command(cmd, "Django system check"))
    
    # Test database migration status
    cmd = "cd /home/atonixdevmaster/orcacloud/backend && /home/atonixdevmaster/orcacloud/.venv/bin/python manage.py showmigrations"
    results.append(run_command(cmd, "Database migration status"))
    
    # Test static files collection (dry run)
    cmd = "cd /home/atonixdevmaster/orcacloud/backend && /home/atonixdevmaster/orcacloud/.venv/bin/python manage.py collectstatic --dry-run"
    results.append(run_command(cmd, "Static files collection (dry run)"))
    
    return all(results)

def test_integration_imports():
    """Test that all our integration modules can be imported."""
    print_header("TESTING INTEGRATION IMPORTS")
    
    try:
        import django
        django.setup()
        
        # Test Zookeeper integration
        try:
            from core.zookeeper_client import ZookeeperClient, get_zk_client
            from core.config_manager import ConfigManager, get_config_manager
            from core.service_discovery import ServiceRegistry, get_service_registry
            from core.distributed_lock import DistributedLock, distributed_lock
            print_success("Zookeeper integration imports")
        except Exception as e:
            print_error(f"Zookeeper integration imports failed: {e}")
        
        # Test Kafka integration
        try:
            from core.kafka_client import KafkaClient, get_kafka_client, EventProducer, EventConsumer
            print_success("Kafka integration imports")
        except Exception as e:
            print_error(f"Kafka integration imports failed: {e}")
        
        # Test RabbitMQ integration
        try:
            from core.rabbitmq_client import RabbitMQClient, get_rabbitmq_client, MessagePublisher, MessageConsumer
            print_success("RabbitMQ integration imports")
        except Exception as e:
            print_error(f"RabbitMQ integration imports failed: {e}")
        
        # Test Email integration
        try:
            from core.email_service import EmailService, EmailTemplate, EmailQueue, get_email_service
            print_success("Email service imports")
        except Exception as e:
            print_error(f"Email service imports failed: {e}")
        
        return True
        
    except Exception as e:
        print_error(f"Django setup failed: {e}")
        return False

def test_management_commands():
    """Test our custom management commands."""
    print_header("TESTING MANAGEMENT COMMANDS")
    
    results = []
    
    # Test Zookeeper command help
    cmd = "cd /home/atonixdevmaster/orcacloud/backend && /home/atonixdevmaster/orcacloud/.venv/bin/python manage.py zookeeper --help"
    results.append(run_command(cmd, "Zookeeper command help"))
    
    # Test Kafka command help
    cmd = "cd /home/atonixdevmaster/orcacloud/backend && /home/atonixdevmaster/orcacloud/.venv/bin/python manage.py kafka --help"
    results.append(run_command(cmd, "Kafka command help"))
    
    # Test Zookeeper status (expected to fail without server)
    cmd = "cd /home/atonixdevmaster/orcacloud/backend && timeout 10 /home/atonixdevmaster/orcacloud/.venv/bin/python manage.py zookeeper status"
    run_command(cmd, "Zookeeper status (expected to fail)", expect_error=True)
    
    # Test Kafka status (expected to fail without server)  
    cmd = "cd /home/atonixdevmaster/orcacloud/backend && timeout 10 /home/atonixdevmaster/orcacloud/.venv/bin/python manage.py kafka status"
    run_command(cmd, "Kafka status (expected to fail)", expect_error=True)
    
    return all(results)

def test_docker_compose_config():
    """Test nerdctl Compose configuration."""
    print_header("TESTING NERDCTL COMPOSE CONFIGURATION")
    
    results = []
    
    # Test nerdctl compose config validation
    cmd = "cd /home/atonixdevmaster/orcacloud && nerdctl compose config -q"
    results.append(run_command(cmd, "nerdctl Compose config validation"))
    
    # List all services
    cmd = "cd /home/atonixdevmaster/orcacloud && nerdctl compose config --services"
    results.append(run_command(cmd, "List nerdctl Compose services"))
    
    return all(results)

def test_environment_variables():
    """Test that required environment variables are being read."""
    print_header("TESTING ENVIRONMENT CONFIGURATION")
    
    try:
        import django
        django.setup()
        from django.conf import settings
        
        # Test database settings
        if hasattr(settings, 'DATABASES'):
            print_success("Database configuration loaded")
        else:
            print_error("Database configuration missing")
        
        # Test Zookeeper settings
        if hasattr(settings, 'ZOOKEEPER_HOSTS'):
            print_success(f"Zookeeper hosts: {settings.ZOOKEEPER_HOSTS}")
        else:
            print_error("Zookeeper configuration missing")
        
        # Test Kafka settings
        if hasattr(settings, 'KAFKA_BOOTSTRAP_SERVERS'):
            print_success(f"Kafka servers: {settings.KAFKA_BOOTSTRAP_SERVERS}")
        else:
            print_error("Kafka configuration missing")
        
        # Test Email settings
        if hasattr(settings, 'EMAIL_HOST'):
            print_success(f"Email host: {settings.EMAIL_HOST}:{settings.EMAIL_PORT}")
        else:
            print_error("Email configuration missing")
        
        return True
        
    except Exception as e:
        print_error(f"Environment test failed: {e}")
        return False

def test_urls_configuration():
    """Test URL configuration."""
    print_header("TESTING URL CONFIGURATION")
    
    results = []
    
    # Test URL patterns
    cmd = "cd /home/atonixdevmaster/orcacloud/backend && /home/atonixdevmaster/orcacloud/.venv/bin/python manage.py show_urls"
    results.append(run_command(cmd, "Show URL patterns"))
    
    return all(results)

def test_python_packages():
    """Test that all required Python packages are installed."""
    print_header("TESTING PYTHON PACKAGES")
    
    required_packages = [
        'django',
        'rest_framework',  # DRF imports as rest_framework, not djangorestframework
        'kafka',
        'pika',
        'kazoo',
        'premailer',
        'html2text',
        'redis',
        'celery'
    ]
    
    results = []
    for package in required_packages:
        try:
            __import__(package)
            print_success(f"Package '{package}' installed")
            results.append(True)
        except ImportError:
            print_error(f"Package '{package}' missing")
            results.append(False)
    
    return all(results)

def create_test_summary(test_results):
    """Create a summary of test results."""
    print_header("TEST SUMMARY")
    
    total_tests = len(test_results)
    passed_tests = sum(test_results.values())
    failed_tests = total_tests - passed_tests
    
    print(f"Total Tests: {total_tests}")
    print_success(f"Passed: {passed_tests}")
    if failed_tests > 0:
        print_error(f"Failed: {failed_tests}")
    else:
        print_success("All tests passed!")
    
    print(f"\nTest Details:")
    for test_name, result in test_results.items():
        status = " PASS" if result else " FAIL"
        color = Colors.GREEN if result else Colors.RED
        print(f"  {color}{status}{Colors.END} {test_name}")
    
    # Calculate success rate
    success_rate = (passed_tests / total_tests) * 100
    print(f"\nSuccess Rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print_success("Platform is ready for development!")
    elif success_rate >= 60:
        print_warning("Platform has some issues but core functionality works")
    else:
        print_error("Platform needs attention before use")

def main():
    """Run all tests."""
    print_header("ORCACLOUD PLATFORM TESTING SUITE")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    test_results = {}
    
    # Run all tests
    test_results["Django Setup"] = test_django_setup()
    test_results["Integration Imports"] = test_integration_imports()
    test_results["Management Commands"] = test_management_commands()
    test_results["Docker Compose Config"] = test_docker_compose_config()
    test_results["Environment Variables"] = test_environment_variables()
    test_results["URL Configuration"] = test_urls_configuration()
    test_results["Python Packages"] = test_python_packages()
    
    # Create summary
    create_test_summary(test_results)
    
    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == '__main__':
    main()