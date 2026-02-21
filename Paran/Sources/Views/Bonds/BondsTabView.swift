import SwiftUI

/// Bonds tab: synastry, composite, and shared travel planning.
struct BondsTabView: View {
    @EnvironmentObject var profileManager: ProfileManager
    @State private var showAddFriend = false
    @State private var selectedFriend: BirthData?

    var body: some View {
        ZStack {
            ParanTheme.background.ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 20) {
                    header
                    friendsList
                    if selectedFriend != nil {
                        bondResults
                        planTogetherCTA
                    }
                }
                .padding(.horizontal)
                .padding(.top, 60)
                .padding(.bottom, 100)
            }
        }
        .sheet(isPresented: $showAddFriend) {
            AddFriendSheet()
                .environmentObject(profileManager)
        }
    }

    private var header: some View {
        VStack(spacing: 8) {
            Text("Bonds")
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(ParanTheme.textPrimary)
            Text("Where should you go together?")
                .font(.system(size: 15))
                .foregroundStyle(ParanTheme.textSecondary)
        }
    }

    private var friendsList: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                SectionHeader(title: "Your Circle", icon: "person.2.fill")
                Spacer()
                Button {
                    showAddFriend = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(ParanTheme.accent)
                }
            }

            if profileManager.friendProfiles.isEmpty {
                PlaceholderCard(text: "Add a friend's birth data to explore where you thrive together.")
            } else {
                ForEach(Array(profileManager.friendProfiles.enumerated()), id: \.offset) { _, friend in
                    FriendRow(friend: friend, isSelected: selectedFriend?.name == friend.name) {
                        withAnimation { selectedFriend = friend }
                    }
                }
            }
        }
    }

    private var bondResults: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Bond Insights", icon: "heart.circle.fill")

            PlaceholderCard(text: "Synastry and composite analysis for you and \(selectedFriend?.name ?? "your friend") — coming soon in a future update.")
        }
    }

    /// "Plan Together" CTA — shared travel timeline
    private var planTogetherCTA: some View {
        Button {
            // Navigate to shared travel timeline
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "airplane.circle.fill")
                    .font(.system(size: 24))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Plan Together")
                        .font(.system(size: 16, weight: .semibold))
                    Text("Find cities and travel windows for both of you")
                        .font(.system(size: 12))
                        .foregroundStyle(ParanTheme.textSecondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
            }
            .foregroundStyle(ParanTheme.textPrimary)
            .padding(16)
            .background(
                LinearGradient(colors: [ParanTheme.accent.opacity(0.2), ParanTheme.rose.opacity(0.15)],
                               startPoint: .leading, endPoint: .trailing),
                in: RoundedRectangle(cornerRadius: 14)
            )
            .overlay {
                RoundedRectangle(cornerRadius: 14)
                    .stroke(ParanTheme.accent.opacity(0.4), lineWidth: 1)
            }
        }
    }
}

struct FriendRow: View {
    let friend: BirthData
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Circle()
                    .fill(ParanTheme.accent.opacity(0.3))
                    .frame(width: 40, height: 40)
                    .overlay {
                        Text(String(friend.name.prefix(1)).uppercased())
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(ParanTheme.accent)
                    }
                VStack(alignment: .leading, spacing: 2) {
                    Text(friend.name)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(ParanTheme.textPrimary)
                    Text(friend.locationName)
                        .font(.system(size: 12))
                        .foregroundStyle(ParanTheme.textSecondary)
                }
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(ParanTheme.accent)
                }
            }
            .padding(12)
            .background(isSelected ? ParanTheme.accent.opacity(0.1) : ParanTheme.surface, in: RoundedRectangle(cornerRadius: 12))
        }
    }
}

struct AddFriendSheet: View {
    @EnvironmentObject var profileManager: ProfileManager
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var dateOfBirth = Date()
    @State private var locationName = ""
    @State private var latitude = ""
    @State private var longitude = ""

    var body: some View {
        NavigationStack {
            ZStack {
                ParanTheme.background.ignoresSafeArea()

                VStack(spacing: 20) {
                    TextField("Name", text: $name)
                        .textFieldStyle(.plain)
                        .padding()
                        .background(ParanTheme.surface, in: RoundedRectangle(cornerRadius: 12))

                    DatePicker("Date of Birth", selection: $dateOfBirth, displayedComponents: [.date, .hourAndMinute])
                        .datePickerStyle(.compact)
                        .tint(ParanTheme.accent)

                    TextField("Birth City", text: $locationName)
                        .textFieldStyle(.plain)
                        .padding()
                        .background(ParanTheme.surface, in: RoundedRectangle(cornerRadius: 12))

                    Button {
                        let friend = BirthData(
                            name: name,
                            dateOfBirth: dateOfBirth,
                            latitude: Double(latitude) ?? 0,
                            longitude: Double(longitude) ?? 0,
                            locationName: locationName
                        )
                        profileManager.friendProfiles.append(friend)
                        dismiss()
                    } label: {
                        Text("Add Friend")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(ParanTheme.background)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(ParanTheme.accent, in: RoundedRectangle(cornerRadius: 14))
                    }
                    .disabled(name.isEmpty)

                    Spacer()
                }
                .padding()
                .foregroundStyle(ParanTheme.textPrimary)
            }
            .navigationTitle("Add a Friend")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(ParanTheme.textSecondary)
                }
            }
        }
    }
}
