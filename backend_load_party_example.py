# Example: birthdaysadieapi/management/commands/load_party.py
# This is an example file - place it in your backend repository

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from birthdaysadieapi.models import Party  # Adjust import based on your model location
from datetime import datetime


class Command(BaseCommand):
    help = 'Load party data'

    def handle(self, *args, **options):
        # Check if party already exists
        party, created = Party.objects.get_or_create(
            pk=1,
            defaults={
                'name': "Sadie's 6th Birthday Party",
                'description': "Join us for an unforgettable celebration!",
                'date': datetime(2025, 11, 15, 12, 0, 0),
                'end_time': datetime(2025, 8, 15, 23, 0, 0),
                'location': "Haley Meadows Farm, 140 Haley Road, Wartrace, TN  37183",
                'host_id': 1,  # Make sure user with ID 1 exists
                'facebook_live_url': "https://fb.me/1N68sW4pC5hCtQr",
                'venmo_username': "isabellaCarter_18",
                'latitude': "35.5061",
                'longitude': "-86.2553",
                'is_active': True,
                'is_public': True,
                'max_guests': None,
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Successfully created party: {party.name}'))
        else:
            self.stdout.write(self.style.WARNING(f'Party already exists: {party.name}'))
